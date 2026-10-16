import QtQuick
import QtQuick.Layouts
import org.kde.plasma.plasmoid
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.components as PC
import org.kde.kirigami as Kirigami
import "connection.js" as Connection

PlasmoidItem {
    id: root
    Plasmoid.backgroundHints: PlasmaCore.Types.NoBackground
    property var workspace: ({signedIn: false, tasks: [], online: false})
    property bool loaded: false
    CompanionRetry { id: reconnect; onRetry: root.request("GET", "/state") }
    property bool busy: false
    property string errorMessage: ""
    property bool thai: Plasmoid.configuration.thai
    signal todoCreated()
    property bool showCompleted: false
    property var todoItems: workspace.todos || []
    property var visibleTodos: todoItems.filter(t => showCompleted || !t.completed)
    WidgetTheme {
        id: design
        dark: Plasmoid.configuration.themeMode === "dark" || (Plasmoid.configuration.themeMode === "system" && Kirigami.Theme.backgroundColor.r < 0.5)
        glass: Plasmoid.configuration.glass
        reduceMotion: true
    }
    function tr(th, en) { return thai ? th : en; }
    function request(method, path, payload) {
        if (busy) return;
        busy = true;
        var xhr = new XMLHttpRequest();
        var finished = false;
        var guard = Qt.createQmlObject('import QtQuick; Timer { interval: 60000; repeat: false }', root);
        guard.interval = method === "GET" ? 8000 : 60000;
        guard.triggered.connect(function() {
            if (!finished) { finished = true; xhr.abort(); root.busy = false; root.errorMessage = root.tr("กำลังรอการเชื่อมต่อ จะลองใหม่อัตโนมัติ", "Waiting for connection. Retrying automatically."); reconnect.failed(); }
            guard.destroy();
        });
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE || finished) return;
            finished = true; guard.stop(); guard.destroy(); root.busy = false;
            try {
                var result = JSON.parse(xhr.responseText);
                reconnect.recovered();
                if (xhr.status === 200) { root.workspace = result; root.loaded = true; root.errorMessage = ""; reconnect.recovered();
                    if (path === "/todos/create") root.todoCreated();
                    if (path === "/login") Qt.callLater(function() { root.request("POST", "/todos/refresh", {}); });
                }
                else { if (result.state) { root.workspace = result.state; root.loaded = true; } root.errorMessage = result.error || root.tr("เชื่อมต่อไม่ได้", "Could not connect."); }
            } catch (e) {
                reconnect.failed(); root.errorMessage = root.tr("กำลังรอตัวช่วยเริ่มทำงาน จะเชื่อมต่อใหม่อัตโนมัติ", "Waiting for companion. Reconnecting automatically."); }
        };
        xhr.open(method, Connection.baseUrl + path);
        xhr.setRequestHeader("Authorization", "Bearer " + Connection.token);
        xhr.setRequestHeader("Content-Type", "application/json");
        guard.start(); xhr.send(payload ? JSON.stringify(payload) : null);
    }
    Component.onCompleted: request("POST", "/todos/refresh", {})
    Timer { interval: 30000; running: true; repeat: true; onTriggered: { root.request("POST", "/todos/refresh", {}); } }
    compactRepresentation: Item {
        Kirigami.Icon { anchors.fill: parent; source: "view-task"; color: design.accent }
        MouseArea { anchors.fill: parent; onClicked: root.expanded = !root.expanded }
    }
    fullRepresentation: Item {
        Layout.minimumWidth: 310; Layout.minimumHeight: 320
        Layout.preferredWidth: 380; Layout.preferredHeight: 440
        implicitWidth: 380; implicitHeight: 440
        Connections { target: root; function onTodoCreated() { todoInput.text = ""; } }
        GlassSurface {
            anchors.fill: parent; theme: design
            wallpaper: Plasmoid.formFactor === PlasmaCore.Types.Planar && Plasmoid.containment
                ? Plasmoid.containment.wallpaperGraphicsObject : null
        }
        ColumnLayout {
            anchors.fill: parent; anchors.margins: 16; spacing: 12
            RowLayout {
                Layout.fillWidth: true
                PC.Label { text: "TaskFlow Todo"; color: design.text; font.pixelSize: 18; font.weight: Font.DemiBold; Layout.fillWidth: true }
                WidgetButton { theme: design; compact: true; text: root.thai ? "EN" : "TH"; onClicked: Plasmoid.configuration.thai = !root.thai }
                WidgetButton { theme: design; compact: true; icon.name: "view-refresh"; enabled: !root.busy; Accessible.name: root.tr("รีเฟรช", "Refresh"); onClicked: root.request("POST", "/todos/refresh", {}) }
            }
            PC.Label { text: root.tr("จดไว้ก่อน ไม่ต้องกำหนดวัน", "A reminder, without a deadline"); color: design.muted; font.pixelSize: 12 }
            PC.Label { visible: root.errorMessage !== ""; text: root.errorMessage; textFormat: Text.PlainText; color: design.danger; wrapMode: Text.Wrap; Layout.fillWidth: true; font.pixelSize: 12 }
            PC.Label { visible: !root.loaded; text: root.tr("กำลังโหลด Todo", "Loading Todo"); color: design.muted }
            ColumnLayout {
                visible: root.loaded && !root.workspace.signedIn
                Layout.fillWidth: true; spacing: 8
                PC.Label { Layout.fillWidth: true; wrapMode: Text.Wrap; text: root.tr("เข้าสู่บัญชี TaskFlow เพื่อดู Todo", "Sign in to see your TaskFlow Todo."); color: design.text }
                PC.Label { text: root.tr("อีเมล", "Email"); color: design.muted }
                WidgetField { id: email; theme: design; Layout.fillWidth: true; Accessible.name: root.tr("อีเมล", "Email") }
                PC.Label { text: root.tr("รหัสผ่าน", "Password"); color: design.muted }
                WidgetField { id: password; theme: design; Layout.fillWidth: true; echoMode: TextInput.Password; Accessible.name: root.tr("รหัสผ่าน", "Password"); onAccepted: if (signIn.enabled) signIn.clicked() }
                WidgetButton { id: signIn; theme: design; primary: true; text: root.tr("เข้าสู่ระบบ", "Sign in"); enabled: !root.busy && email.text.trim() !== "" && password.text !== ""; onClicked: { root.request("POST", "/login", {email: email.text.trim(), password: password.text}); password.text = ""; } }
            }

            ColumnLayout {
                visible: root.workspace.signedIn
                Layout.fillWidth: true; Layout.fillHeight: true; spacing: 10
                RowLayout {
                    Layout.fillWidth: true; spacing: 8
                    WidgetField { id: todoInput; theme: design; enabled: !root.busy; Layout.fillWidth: true; maximumLength: 240; placeholderText: root.tr("อยากเตือนตัวเองเรื่องอะไร?", "What do you want to remember?"); Accessible.name: root.tr("รายการใหม่", "New Todo"); onAccepted: if (addTodo.enabled) addTodo.clicked() }
                    WidgetButton { id: addTodo; theme: design; primary: true; text: root.tr("เพิ่ม", "Add"); enabled: !root.busy && todoInput.text.trim() !== ""; onClicked: root.request("POST", "/todos/create", {title: todoInput.text}) }
                }
                RowLayout {
                    Layout.fillWidth: true
                    PC.Label { text: root.todoItems.filter(t => !t.completed).length + root.tr(" รายการที่ยังไม่เสร็จ", " to do"); color: design.accent; font.pixelSize: 12; Layout.fillWidth: true }
                    WidgetButton { theme: design; compact: true; selected: root.showCompleted; text: root.tr("ดูที่เสร็จแล้ว", "Show completed"); onClicked: root.showCompleted = !root.showCompleted }
                }
                PC.ScrollView {
                    Layout.fillWidth: true; Layout.fillHeight: true
                    contentItem: ListView {
                        id: todos; clip: true; spacing: 8; model: root.visibleTodos
                        delegate: Rectangle {
                            required property var modelData
                            width: todos.width; height: Math.max(50, row.implicitHeight + 16)
                            radius: design.rowRadius; color: Qt.rgba(design.text.r, design.text.g, design.text.b, 0.04)
                            RowLayout {
                                id: row; anchors.fill: parent; anchors.margins: 8; spacing: 8
                                PC.CheckBox { checked: modelData.completed; enabled: !root.busy; Accessible.name: modelData.title; onClicked: root.request("POST", "/todos/update", {id: modelData.id, completed: !modelData.completed}) }
                                PC.Label { text: modelData.title; textFormat: Text.PlainText; Layout.fillWidth: true; color: modelData.completed ? design.muted : design.text; font.strikeout: modelData.completed; font.pixelSize: 13; wrapMode: Text.Wrap }
                            }
                        }
                        PC.Label { anchors.centerIn: parent; visible: todos.count === 0; text: root.tr("โล่งแล้ว จดเพิ่มได้เลย", "All clear. Add a reminder above."); color: design.muted; font.pixelSize: 12; wrapMode: Text.Wrap; width: parent.width; horizontalAlignment: Text.AlignHCenter }
                    }
                }
                RowLayout {
                    Layout.fillWidth: true
                    PC.Label { text: root.workspace.todoOnline ? root.tr("ซิงก์กับ Todo บนเว็บ", "Synced with web Todo") : root.tr("ออฟไลน์ · ข้อมูลล่าสุด", "Offline · cached reminders"); color: design.muted; font.pixelSize: 11; Layout.fillWidth: true }
                    WidgetButton { theme: design; compact: true; text: root.tr("เปิดเว็บ", "Open web"); onClicked: Qt.openUrlExternally(Plasmoid.configuration.webUrl) }
                }
            }
            Item { visible: !root.workspace.signedIn; Layout.fillHeight: true }
        }
    }
}
