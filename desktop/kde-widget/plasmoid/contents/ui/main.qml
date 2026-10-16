import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PC
import org.kde.kirigami as Kirigami
import "connection.js" as Connection

PlasmoidItem {
    id: root
    width: 380
    height: 500
    Plasmoid.backgroundHints: Plasmoid.formFactor === PlasmaCore.Types.Planar
        ? PlasmaCore.Types.NoBackground : PlasmaCore.Types.TranslucentBackground
    property var state: ({signedIn: false, tasks: [], online: false})
    property bool loaded: false
    CompanionRetry { id: reconnect; onRetry: root.request("GET", "/state") }
    property bool busy: false
    property string errorMessage: ""
    property bool settingsOpen: false
    property bool thai: Plasmoid.configuration.thai
    property int view: Plasmoid.configuration.view
    property string feedback: ""
    property string completingId: ""
    readonly property bool systemDark: Kirigami.Theme.backgroundColor.r * 0.299 + Kirigami.Theme.backgroundColor.g * 0.587 + Kirigami.Theme.backgroundColor.b * 0.114 < 0.5
    WidgetTheme {
        id: design
        dark: Plasmoid.configuration.themeMode === "dark" || (Plasmoid.configuration.themeMode === "system" && root.systemDark)
        glass: Plasmoid.configuration.glass
        reduceMotion: Plasmoid.configuration.reduceMotion || Kirigami.Units.longDuration === 0
    }
    Timer { id: feedbackTimer; interval: 3500; onTriggered: root.feedback = "" }
    property var now: new Date()
    property var visibleTasks: filterTasks()
    property int todayCount: state.tasks.filter(t => t.due_date === dayKey(now)).length

    function tr(th, en) { return thai ? th : en; }
    function dayKey(date) {
        return date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2)
            + "-" + ("0" + date.getDate()).slice(-2);
    }
    function deadline(task) {
        // Numeric constructor uses the computer's local timezone, as the website does.
        var d = task.due_date.split("-");
        var t = (task.due_time || "23:59:59").split(":");
        return new Date(Number(d[0]), Number(d[1]) - 1, Number(d[2]),
                        Number(t[0]), Number(t[1]), Number(t[2] || 0));
    }
    function filterTasks() {
        var today = dayKey(now);
        var end = new Date(now); end.setDate(end.getDate() + 7);
        return state.tasks.filter(function(task) {
            if (view === 1) return task.due_date === today;
            if (view === 2) return deadline(task) >= now && task.due_date <= dayKey(end);
            if (view === 3) return deadline(task) < now;
            return true;
        });
    }
    function countdown(task) {
        var difference = deadline(task) - now;
        if (difference < 0) return tr("เลยกำหนด", "Overdue");
        var minutes = Math.ceil(difference / 60000);
        if (minutes === 0) return tr("ถึงกำหนดแล้ว", "Due now");
        if (minutes < 60) return tr("เหลือ " + minutes + " นาที", minutes + " min left");
        if (minutes < 1440) return tr("เหลือ " + Math.ceil(minutes / 60) + " ชั่วโมง", Math.ceil(minutes / 60) + " hr left");
        return tr("เหลือ " + Math.ceil(minutes / 1440) + " วัน", Math.ceil(minutes / 1440) + " days left");
    }
    function dateLabel(task) {
        var d = deadline(task);
        var label = Qt.formatDate(d, "d/MM");
        if (task.due_date === dayKey(now)) label = tr("วันนี้", "Today");
        return label + (task.due_time ? " " + task.due_time.slice(0, 5) : "");
    }
    function completeTask(id) {
        if (busy) return;
        completingId = id;
        request("POST", "/complete", {id: id});
    }
    function openWeb() {
        var url = Plasmoid.configuration.webUrl || state.webUrl || "";
        if (/^https?:\/\//.test(url)) Qt.openUrlExternally(url);
        else { settingsOpen = true; errorMessage = tr("ใส่ URL เว็บ TaskFlow ก่อนครับ", "Set your TaskFlow website URL first."); }
    }
    function request(method, path, data) {
        if (busy) return;
        busy = true;
        var xhr = new XMLHttpRequest();
        var finished = false;
        var guard = Qt.createQmlObject('import QtQuick; Timer { interval: 60000; repeat: false }', root);
        guard.interval = method === "GET" ? 8000 : 60000;
        guard.triggered.connect(function() {
            if (!finished) {
                finished = true; xhr.abort(); root.busy = false; root.completingId = "";
                root.errorMessage = root.tr("กำลังรอการเชื่อมต่อ จะลองใหม่อัตโนมัติ", "Waiting for connection. Retrying automatically.");
                reconnect.failed();
            }
            guard.destroy();
        });
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE || finished) return;
            finished = true; guard.stop(); guard.destroy(); root.busy = false;
            try {
                var result = JSON.parse(xhr.responseText);
                reconnect.recovered();
                if (xhr.status === 200) {
                    root.state = result; root.loaded = true; root.errorMessage = ""; reconnect.recovered();
                    if (path === "/complete") {
                        root.feedback = root.tr("ทำเสร็จแล้ว", "Task completed"); feedbackTimer.restart();
                    }
                } else {
                    if (result.state) { root.state = result.state; root.loaded = true; }
                    root.errorMessage = result.error || root.tr("เชื่อมต่อไม่ได้", "Could not connect.");
                }
            } catch (e) {
                reconnect.failed();
                root.errorMessage = root.tr("กำลังรอตัวช่วยเริ่มทำงาน จะเชื่อมต่อใหม่อัตโนมัติ", "Waiting for companion. Reconnecting automatically.");
            }
            root.completingId = "";
        };
        xhr.open(method, Connection.baseUrl + path);
        xhr.setRequestHeader("Authorization", "Bearer " + Connection.token);
        xhr.setRequestHeader("Content-Type", "application/json");
        guard.start();
        xhr.send(data ? JSON.stringify(data) : null);
    }
    Component.onCompleted: request("GET", "/state")
    Timer {
        interval: 30000; running: true; repeat: true
        onTriggered: { root.now = new Date(); root.request("GET", "/state"); }
    }

    compactRepresentation: Item {
        Kirigami.Icon { anchors.fill: parent; source: "view-task"; color: design.accent }
        Rectangle {
            visible: root.todayCount > 0
            anchors.right: parent.right; anchors.top: parent.top
            width: badge.implicitWidth + 9; height: badge.implicitHeight + 3; radius: height / 2
            color: design.accent
            PC.Label { id: badge; anchors.centerIn: parent; text: root.todayCount; color: design.accentText; font.pixelSize: 10; font.bold: true }
        }
        MouseArea { id: panelMouse; anchors.fill: parent; hoverEnabled: true; onClicked: root.expanded = !root.expanded }
        PC.ToolTip { visible: panelMouse.containsMouse; text: "TaskFlow · " + root.tr("วันนี้ ", "Today: ") + root.todayCount }
    }
    fullRepresentation: Item {
        id: panel
        readonly property bool blurAvailable: surface.canBlur
        Layout.minimumWidth: 310
        Layout.minimumHeight: 300
        Layout.preferredWidth: 380
        Layout.preferredHeight: 500
        implicitWidth: 380; implicitHeight: 500
        Kirigami.Theme.inherit: false
        Kirigami.Theme.colorSet: design.dark ? Kirigami.Theme.Complementary : Kirigami.Theme.Window

        GlassSurface {
            id: surface
            anchors.fill: parent
            theme: design
            wallpaper: Plasmoid.formFactor === PlasmaCore.Types.Planar && Plasmoid.containment
                ? Plasmoid.containment.wallpaperGraphicsObject : null
        }
        ColumnLayout {
            anchors.fill: parent
            anchors.margins: panel.width < 350 ? 14 : 18
            spacing: 12
            RowLayout {
                Layout.fillWidth: true
                Row {
                    spacing: 0
                    PC.Label { text: "Task"; color: design.text; font.pixelSize: 18; font.weight: Font.DemiBold }
                    PC.Label { text: "Flow"; color: design.accent; font.pixelSize: 18; font.weight: Font.DemiBold }
                }
                Item { Layout.fillWidth: true }
                WidgetButton {
                    theme: design; compact: true; icon.name: "view-refresh"
                    visible: (root.state.signedIn || root.errorMessage !== "") && !root.settingsOpen
                    enabled: !root.busy
                    tip: root.tr("รีเฟรช", "Refresh"); Accessible.name: tip
                    onClicked: root.state.signedIn ? root.request("POST", "/refresh", {}) : root.request("GET", "/state")
                }
                WidgetButton {
                    theme: design; compact: true; selected: root.settingsOpen
                    icon.name: root.settingsOpen ? "window-close" : "configure"
                    tip: root.settingsOpen ? root.tr("ปิดตั้งค่า", "Close settings") : root.tr("ตั้งค่า", "Settings")
                    Accessible.name: tip
                    onClicked: root.settingsOpen = !root.settingsOpen
                }
            }
            PC.Label {
                visible: root.errorMessage !== ""
                Layout.fillWidth: true
                text: root.errorMessage; textFormat: Text.PlainText; wrapMode: Text.Wrap
                color: design.danger; font.pixelSize: 12
            }
            ColumnLayout {
                visible: !root.loaded && !root.errorMessage
                Layout.fillWidth: true; spacing: 12
                PC.Label { text: root.tr("กำลังโหลดงาน", "Loading tasks"); color: design.muted; font.pixelSize: 12 }
                Repeater {
                    model: 3
                    Rectangle {
                        Layout.fillWidth: true; implicitHeight: 58; radius: design.rowRadius
                        color: Qt.rgba(design.text.r, design.text.g, design.text.b, 0.06)
                        Rectangle { x: 14; y: 14; width: parent.width * 0.6; height: 9; radius: 4; color: design.edge }
                        Rectangle { x: 14; y: 34; width: parent.width * 0.35; height: 7; radius: 3; color: design.edge }
                    }
                }
            }
            // Settings and login scroll independently so controls remain reachable at small sizes.
            PC.ScrollView {
                id: settingsScroll
                objectName: "settingsScroll"
                QQC.ScrollBar.horizontal.policy: QQC.ScrollBar.AlwaysOff
                visible: root.settingsOpen
                Layout.fillWidth: true; Layout.fillHeight: true
                contentItem: Flickable {
                    clip: true
                    contentHeight: settingsBody.implicitHeight
                    contentWidth: settingsScroll.availableWidth
                    flickableDirection: Flickable.VerticalFlick
                    ColumnLayout {
                        id: settingsBody; width: settingsScroll.availableWidth; spacing: 14
                        PC.Label { text: root.tr("ตั้งค่า widget", "Widget settings"); color: design.text; font.pixelSize: 20; font.weight: Font.DemiBold }
                        PC.Label { text: root.tr("ภาษา", "Language"); color: design.muted; font.pixelSize: 12 }
                        RowLayout {
                            Layout.fillWidth: true
                            WidgetButton { theme: design; text: "ไทย"; selected: root.thai; Layout.fillWidth: true; onClicked: Plasmoid.configuration.thai = true }
                            WidgetButton { theme: design; text: "English"; selected: !root.thai; Layout.fillWidth: true; onClicked: Plasmoid.configuration.thai = false }
                        }
                        PC.Label { text: root.tr("ธีม", "Theme"); color: design.muted; font.pixelSize: 12 }
                        RowLayout {
                            Layout.fillWidth: true
                            Repeater {
                                model: [{key: "system", label: root.tr("ตามระบบ", "System")}, {key: "dark", label: root.tr("เข้ม", "Dark")}, {key: "light", label: root.tr("สว่าง", "Light")}]
                                WidgetButton {
                                    required property var modelData
                                    theme: design; text: modelData.label; selected: Plasmoid.configuration.themeMode === modelData.key
                                    Layout.fillWidth: true; onClicked: Plasmoid.configuration.themeMode = modelData.key
                                }
                            }
                        }
                        PC.CheckBox {
                            id: glassToggle
                            text: root.tr("พื้นหลังกระจกฝ้า", "Frosted background")
                            checked: Plasmoid.configuration.glass
                            onToggled: Plasmoid.configuration.glass = checked
                            contentItem: PC.Label { text: glassToggle.text; color: design.text; leftPadding: 30; font.pixelSize: 13; verticalAlignment: Text.AlignVCenter }
                        }
                        PC.CheckBox {
                            id: motionToggle
                            text: root.tr("ลดการเคลื่อนไหว", "Reduce motion")
                            checked: Plasmoid.configuration.reduceMotion
                            onToggled: Plasmoid.configuration.reduceMotion = checked
                            contentItem: PC.Label { text: motionToggle.text; color: design.text; leftPadding: 30; font.pixelSize: 13; verticalAlignment: Text.AlignVCenter }
                        }
                        PC.Label { text: root.tr("URL เว็บ TaskFlow", "TaskFlow website URL"); color: design.muted; font.pixelSize: 12 }
                        WidgetField {
                            id: webUrl; theme: design; Layout.fillWidth: true
                            text: Plasmoid.configuration.webUrl || root.state.webUrl || ""
                            placeholderText: "https://taskflow-ruddy-one.vercel.app/"
                            Accessible.name: root.tr("URL เว็บ TaskFlow", "TaskFlow website URL")
                        }
                        WidgetButton {
                            theme: design; primary: true; Layout.fillWidth: true
                            text: root.tr("บันทึก", "Save")
                            enabled: /^https?:\/\//.test(webUrl.text.trim())
                            onClicked: { Plasmoid.configuration.webUrl = webUrl.text.trim(); root.settingsOpen = false; root.errorMessage = ""; }
                        }
                        PC.Label { Layout.fillWidth: true; text: root.state.email || ""; textFormat: Text.PlainText; elide: Text.ElideRight; color: design.muted; font.pixelSize: 12 }
                        PC.Label {
                            Layout.fillWidth: true; wrapMode: Text.Wrap; color: design.muted; font.pixelSize: 12
                            text: root.tr("เตือนก่อนส่ง 1 ชั่วโมง ขณะเครื่องเปิดและออนไลน์", "Reminders start 1 hour before deadlines while this computer is on and online.")
                        }
                        WidgetButton {
                            theme: design; visible: root.state.signedIn; enabled: !root.busy
                            text: root.tr("ออกจากบัญชี", "Sign out"); Layout.fillWidth: true
                            onClicked: root.request("POST", "/logout", {})
                        }
                        Item { implicitHeight: 4 }
                    }
                }
            }
            PC.ScrollView {
                id: loginScroll
                objectName: "loginScroll"
                QQC.ScrollBar.horizontal.policy: QQC.ScrollBar.AlwaysOff
                visible: root.loaded && !root.state.signedIn && !root.settingsOpen
                Layout.fillWidth: true; Layout.fillHeight: true
                contentItem: Flickable {
                    clip: true; contentHeight: loginBody.implicitHeight; contentWidth: loginScroll.availableWidth
                    flickableDirection: Flickable.VerticalFlick
                    ColumnLayout {
                        id: loginBody; width: loginScroll.availableWidth; spacing: 10
                        Item { implicitHeight: 8 }
                        PC.Label { text: root.tr("งานของคุณ อยู่ตรงนี้", "Your tasks, right here"); color: design.text; font.pixelSize: 22; font.weight: Font.DemiBold; Layout.fillWidth: true; wrapMode: Text.Wrap }
                        PC.Label {
                            Layout.fillWidth: true; wrapMode: Text.Wrap; color: design.muted; font.pixelSize: 13
                            text: root.tr("เข้าสู่บัญชีเดียวกับ TaskFlow เพื่อดูงานโดยไม่ต้องเปิดเว็บ", "Sign in to TaskFlow to keep deadlines on your desktop.")
                        }
                        Item { implicitHeight: 6 }
                        PC.Label { text: root.tr("อีเมล", "Email"); color: design.text; font.pixelSize: 12 }
                        WidgetField { id: email; theme: design; Layout.fillWidth: true; placeholderText: "you@example.com"; Accessible.name: root.tr("อีเมล", "Email"); inputMethodHints: Qt.ImhEmailCharactersOnly }
                        PC.Label { text: root.tr("รหัสผ่าน", "Password"); color: design.text; font.pixelSize: 12 }
                        WidgetField {
                            id: password; theme: design; Layout.fillWidth: true
                            Accessible.name: root.tr("รหัสผ่าน", "Password"); echoMode: TextInput.Password
                            onAccepted: { if (loginButton.enabled) loginButton.clicked(); }
                        }
                        WidgetButton {
                            id: loginButton; theme: design; primary: true; Layout.fillWidth: true
                            text: root.busy ? root.tr("กำลังเข้าสู่ระบบ", "Signing in") : root.tr("เข้าสู่ระบบ", "Sign in")
                            enabled: !root.busy && email.text.trim() !== "" && password.text !== ""
                            onClicked: {
                                if (!enabled) return;
                                root.request("POST", "/login", {email: email.text.trim(), password: password.text});
                                password.text = "";
                            }
                        }
                        Item { implicitHeight: 4 }
                        PC.Label {
                            Layout.fillWidth: true; wrapMode: Text.Wrap; color: design.muted; font.pixelSize: 12
                            text: root.tr("ใช้บัญชีที่มีอยู่แล้ว งาน Guest ต้องย้ายขึ้นบัญชีผ่านเว็บก่อน", "Use your existing account. Move guest tasks to cloud in the website first.")
                        }
                    }
                }
            }
            ColumnLayout {
                visible: root.state.signedIn && !root.settingsOpen
                Layout.fillWidth: true; Layout.fillHeight: true; spacing: 12
                RowLayout {
                    Layout.fillWidth: true; spacing: 12
                    PC.Label { text: root.todayCount; font.pixelSize: 38; font.weight: Font.DemiBold; color: design.text }
                    ColumnLayout {
                        Layout.fillWidth: true; spacing: 2
                        PC.Label { text: root.tr("งานส่งวันนี้", "Due today"); font.pixelSize: 14; font.weight: Font.DemiBold; color: design.text }
                        PC.Label {
                            text: root.state.tasks.length + root.tr(" งานที่ยังไม่เสร็จ", " unfinished tasks")
                            font.pixelSize: 12; color: design.muted
                        }
                    }
                }
                RowLayout {
                    Layout.fillWidth: true; spacing: 3
                    Repeater {
                        model: [root.tr("ทั้งหมด", "All"), root.tr("วันนี้", "Today"), root.tr("ใกล้ส่ง", "Soon"), root.tr("เลยกำหนด", "Overdue")]
                        WidgetButton {
                            required property int index
                            required property string modelData
                            theme: design; compact: true; text: modelData; selected: root.view === index
                            Layout.fillWidth: true
                            Accessible.name: text; Accessible.checkable: true; Accessible.checked: selected
                            onClicked: Plasmoid.configuration.view = index
                        }
                    }
                }
                PC.ScrollView {
                    Layout.fillWidth: true; Layout.fillHeight: true
                    contentItem: ListView {
                        id: taskList; clip: true; spacing: 6
                        model: root.visibleTasks
                        delegate: Rectangle {
                            required property var modelData
                            width: taskList.width
                            height: taskRow.implicitHeight + 24
                            radius: design.rowRadius
                            color: Qt.rgba(design.text.r, design.text.g, design.text.b, 0.045)
                            RowLayout {
                                id: taskRow; anchors.fill: parent; anchors.margins: 12; spacing: 10
                                WidgetButton {
                                    id: completeButton
                                    theme: design; compact: true
                                    Layout.alignment: Qt.AlignTop
                                    implicitWidth: 30; implicitHeight: 30
                                    enabled: !root.busy && root.state.online
                                    tip: root.tr("ทำเสร็จ", "Mark complete")
                                    Accessible.name: tip + ": " + modelData.title
                                    onClicked: root.completeTask(modelData.id)
                                    contentItem: Item {
                                        implicitWidth: 18; implicitHeight: 18
                                        Rectangle {
                                            anchors.centerIn: parent; width: 18; height: 18
                                            radius: 6; color: completeButton.hovered ? design.accent : "transparent"
                                            border.width: 1; border.color: design.accent
                                            Kirigami.Icon { anchors.centerIn: parent; width: 12; height: 12; source: "checkmark"; color: design.accentText; visible: completeButton.hovered }
                                        }
                                    }
                                }
                                ColumnLayout {
                                    Layout.fillWidth: true; spacing: 5
                                    PC.Label {
                                        text: modelData.title; textFormat: Text.PlainText; color: design.text
                                        font.pixelSize: 14; font.weight: Font.DemiBold; wrapMode: Text.Wrap
                                        Layout.fillWidth: true
                                    }
                                    PC.Label {
                                        text: modelData.category; textFormat: Text.PlainText; color: design.muted
                                        font.pixelSize: 11; elide: Text.ElideRight; Layout.fillWidth: true
                                    }
                                    RowLayout {
                                        Layout.fillWidth: true; spacing: 8
                                        PC.Label {
                                            text: root.completingId === modelData.id ? root.tr("กำลังบันทึก", "Saving") : root.countdown(modelData)
                                            color: root.deadline(modelData) < root.now ? design.danger : design.accent
                                            font.pixelSize: 11; font.weight: Font.Medium; Layout.fillWidth: true; elide: Text.ElideRight
                                        }
                                        PC.Label { text: root.dateLabel(modelData); color: design.muted; font.pixelSize: 11 }
                                    }
                                }
                            }
                        }
                        ColumnLayout {
                            anchors.centerIn: parent; width: parent.width - 20; spacing: 8
                            visible: taskList.count === 0
                            Kirigami.Icon { source: "view-task"; color: design.accent; implicitWidth: 32; implicitHeight: 32; Layout.alignment: Qt.AlignHCenter }
                            PC.Label {
                                text: root.state.tasks.length === 0 ? root.tr("ไม่มีงานค้างแล้ว", "All caught up") : root.tr("ไม่มีงานในมุมมองนี้", "No tasks in this view")
                                font.pixelSize: 14; color: design.text; Layout.alignment: Qt.AlignHCenter
                            }
                            PC.Label {
                                text: root.state.tasks.length === 0 ? root.tr("เพิ่มงานใหม่ได้ในเว็บ TaskFlow", "Add a task in TaskFlow when you're ready") : root.tr("ลองเลือกมุมมองทั้งหมด", "Try the All view")
                                font.pixelSize: 12; color: design.muted; wrapMode: Text.Wrap; horizontalAlignment: Text.AlignHCenter; Layout.fillWidth: true
                            }
                        }
                    }
                }
                RowLayout {
                    Layout.fillWidth: true
                    PC.Label {
                        Layout.fillWidth: true; font.pixelSize: 11; elide: Text.ElideRight
                        Accessible.role: root.feedback !== "" ? Accessible.AlertMessage : Accessible.StaticText
                        color: root.feedback !== "" ? design.accent : design.muted
                        text: root.feedback !== "" ? root.feedback
                            : root.state.online ? root.tr("ซิงก์ ", "Synced ") + (root.state.lastSync || "").slice(11, 16)
                            : root.tr("ออฟไลน์ ข้อมูลล่าสุด ", "Offline, last sync ") + (root.state.lastSync || "").replace("T", " ")
                    }
                    WidgetButton { theme: design; compact: true; text: root.tr("เปิดเว็บ", "Open web"); icon.name: "go-next"; onClicked: root.openWeb() }
                }
            }
            Item { visible: !root.loaded; Layout.fillHeight: true }
        }
    }
}
