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
    property var today: new Date()
    property int year: today.getFullYear()
    property int month: today.getMonth()
    property string selectedDate: dateKey(today)
    property var selectedTasks: workspace.tasks.filter(t => t.due_date === selectedDate)
    WidgetTheme {
        id: design
        dark: Plasmoid.configuration.themeMode === "dark" || (Plasmoid.configuration.themeMode === "system" && Kirigami.Theme.backgroundColor.r < 0.5)
        glass: Plasmoid.configuration.glass
        reduceMotion: true
    }
    function tr(th, en) { return thai ? th : en; }
    function dateKey(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth()+1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
    function cellDate(index) {
        var first = new Date(year, month, 1);
        var offset = (first.getDay() + 6) % 7;
        return new Date(year, month, index - offset + 1, 12);
    }
    function countFor(key) { return workspace.tasks.filter(t => t.due_date === key).length; }
    function shiftMonth(amount) {
        var next = new Date(year, month + amount, 1);
        year = next.getFullYear(); month = next.getMonth();
        selectedDate = dateKey(next);
    }
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
                if (xhr.status === 200) { root.workspace = result; root.loaded = true; root.errorMessage = ""; reconnect.recovered(); }
                else { if (result.state) { root.workspace = result.state; root.loaded = true; } root.errorMessage = result.error || root.tr("เชื่อมต่อไม่ได้", "Could not connect."); }
            } catch (e) {
                reconnect.failed(); root.errorMessage = root.tr("กำลังรอตัวช่วยเริ่มทำงาน จะเชื่อมต่อใหม่อัตโนมัติ", "Waiting for companion. Reconnecting automatically."); }
        };
        xhr.open(method, Connection.baseUrl + path);
        xhr.setRequestHeader("Authorization", "Bearer " + Connection.token);
        xhr.setRequestHeader("Content-Type", "application/json");
        guard.start(); xhr.send(payload ? JSON.stringify(payload) : null);
    }
    Component.onCompleted: request("GET", "/state")
    Timer { interval: 30000; running: true; repeat: true; onTriggered: { root.today = new Date(); root.request("GET", "/state"); } }
    compactRepresentation: Item {
        Kirigami.Icon { anchors.fill: parent; source: "view-calendar"; color: design.accent }
        MouseArea { anchors.fill: parent; onClicked: root.expanded = !root.expanded }
    }
    fullRepresentation: Item {
        id: calendarPanel
        Layout.minimumWidth: 310; Layout.minimumHeight: 450
        Layout.preferredWidth: 380; Layout.preferredHeight: 580
        implicitWidth: 380; implicitHeight: 580
        GlassSurface {
            anchors.fill: parent
            theme: design
            wallpaper: Plasmoid.formFactor === PlasmaCore.Types.Planar && Plasmoid.containment
                ? Plasmoid.containment.wallpaperGraphicsObject : null
        }
        ColumnLayout {
            anchors.fill: parent; anchors.margins: 16; spacing: 10
            RowLayout {
                Layout.fillWidth: true
                PC.Label { text: "TaskFlow Calendar"; color: design.text; font.pixelSize: 17; font.weight: Font.DemiBold; Layout.fillWidth: true }
                WidgetButton { theme: design; compact: true; text: root.thai ? "EN" : "TH"; onClicked: Plasmoid.configuration.thai = !root.thai }
                WidgetButton { theme: design; compact: true; icon.name: "view-refresh"; enabled: !root.busy; Accessible.name: root.tr("รีเฟรช", "Refresh"); onClicked: root.workspace.signedIn ? root.request("POST", "/refresh", {}) : root.request("GET", "/state") }
            }
            PC.Label { Layout.fillWidth: true; visible: root.errorMessage !== ""; text: root.errorMessage; textFormat: Text.PlainText; color: design.danger; wrapMode: Text.Wrap; font.pixelSize: 12 }
            PC.Label { visible: !root.loaded; text: root.tr("กำลังโหลดปฏิทิน", "Loading calendar"); color: design.muted }
            ColumnLayout {
                visible: root.loaded && !root.workspace.signedIn
                Layout.fillWidth: true; spacing: 8
                PC.Label { Layout.fillWidth: true; wrapMode: Text.Wrap; text: root.tr("เข้าสู่บัญชี TaskFlow เพื่อดูงานที่มีกำหนดส่ง", "Sign in to see your scheduled TaskFlow work."); color: design.text }
                PC.Label { text: root.tr("อีเมล", "Email"); color: design.muted }
                WidgetField { id: email; theme: design; Layout.fillWidth: true; Accessible.name: root.tr("อีเมล", "Email") }
                PC.Label { text: root.tr("รหัสผ่าน", "Password"); color: design.muted }
                WidgetField { id: password; theme: design; Layout.fillWidth: true; echoMode: TextInput.Password; Accessible.name: root.tr("รหัสผ่าน", "Password"); onAccepted: if (signIn.enabled) signIn.clicked() }
                WidgetButton { id: signIn; theme: design; primary: true; text: root.tr("เข้าสู่ระบบ", "Sign in"); enabled: !root.busy && email.text.trim() !== "" && password.text !== ""; onClicked: { root.request("POST", "/login", {email: email.text.trim(), password: password.text}); password.text = ""; } }
            }
            ColumnLayout {
                visible: root.workspace.signedIn
                Layout.fillWidth: true; Layout.fillHeight: true; spacing: 8
                RowLayout {
                    Layout.fillWidth: true
                    WidgetButton { theme: design; compact: true; icon.name: "go-previous"; Accessible.name: root.tr("เดือนก่อน", "Previous month"); onClicked: root.shiftMonth(-1) }
                    PC.Label { text: new Date(root.year, root.month, 1).toLocaleDateString(Qt.locale(root.thai ? "th_TH" : "en_US"), "MMMM yyyy"); Layout.fillWidth: true; horizontalAlignment: Text.AlignHCenter; color: design.text; font.pixelSize: 16; font.weight: Font.DemiBold }
                    WidgetButton { theme: design; compact: true; icon.name: "go-next"; Accessible.name: root.tr("เดือนถัดไป", "Next month"); onClicked: root.shiftMonth(1) }
                }
                RowLayout {
                    Layout.fillWidth: true
                    Repeater { model: root.thai ? ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"] : ["M", "T", "W", "T", "F", "S", "S"]; PC.Label { required property string modelData; text: modelData; Layout.fillWidth: true; horizontalAlignment: Text.AlignHCenter; color: design.muted; font.pixelSize: 11 } }
                }
                GridLayout {
                    Layout.fillWidth: true; columns: 7; rowSpacing: 4; columnSpacing: 4
                    Repeater {
                        model: 42
                        WidgetButton {
                            id: dayButton
                            required property int index
                            property var day: root.cellDate(index)
                            property string key: root.dateKey(day)
                            theme: design; compact: true; text: day.getDate(); selected: key === root.selectedDate
                            Layout.fillWidth: true; implicitHeight: calendarPanel.height < 520 ? 26 : 33; implicitWidth: 30
                            opacity: day.getMonth() === root.month ? 1 : 0.8
                            Accessible.name: key + ": " + root.countFor(key) + root.tr(" งาน", " tasks")
                            onClicked: root.selectedDate = key
                            contentItem: Item {
                                PC.Label { anchors.centerIn: parent; text: dayButton.day.getDate(); color: design.text; font.pixelSize: 12; font.weight: dayButton.key === root.dateKey(root.today) ? Font.DemiBold : Font.Normal }
                                Rectangle { anchors.horizontalCenter: parent.horizontalCenter; anchors.bottom: parent.bottom; width: 5; height: 3; radius: 1.5; color: design.accent; visible: root.countFor(dayButton.key) > 0 }
                            }
                        }
                    }
                }
                RowLayout {
                    Layout.fillWidth: true
                    PC.Label { text: root.selectedDate; color: design.text; font.pixelSize: 13; font.weight: Font.DemiBold; Layout.fillWidth: true }
                    WidgetButton { theme: design; compact: true; text: root.tr("วันนี้", "Today"); onClicked: { root.year=root.today.getFullYear();root.month=root.today.getMonth();root.selectedDate=root.dateKey(root.today); } }
                }
                PC.ScrollView {
                    Layout.fillWidth: true; Layout.fillHeight: true
                    contentItem: ListView {
                        id: events; clip: true; spacing: 8; model: root.selectedTasks
                        delegate: ColumnLayout {
                            required property var modelData
                            width: events.width; spacing: 4
                            PC.Label { text: modelData.title; textFormat: Text.PlainText; color: design.text; font.pixelSize: 13; font.weight: Font.DemiBold; wrapMode: Text.Wrap; Layout.fillWidth: true }
                            PC.Label { text: modelData.category + (modelData.due_time ? " · " + modelData.due_time.slice(0,5) : ""); textFormat: Text.PlainText; color: design.accent; font.pixelSize: 11; elide: Text.ElideRight; Layout.fillWidth: true }
                            PC.Label { visible: Boolean(modelData.description); text: modelData.description || ""; textFormat: Text.PlainText; color: design.muted; wrapMode: Text.Wrap; font.pixelSize: 11; maximumLineCount: 3; elide: Text.ElideRight; Layout.fillWidth: true }
                            Rectangle { Layout.fillWidth: true; height: 1; color: design.edge }
                        }
                        PC.Label { anchors.centerIn: parent; visible: events.count === 0; text: root.tr("ไม่มีงานค้างส่งวันนี้", "No unfinished work on this date"); color: design.muted; font.pixelSize: 12 }
                    }
                }
                RowLayout {
                    Layout.fillWidth: true
                    PC.Label { text: root.workspace.online ? root.tr("งานที่ยังไม่เสร็จ", "Unfinished scheduled work") : root.tr("ออฟไลน์ ข้อมูลล่าสุด", "Offline, cached work"); color: design.muted; font.pixelSize: 11; Layout.fillWidth: true }
                    WidgetButton { theme: design; compact: true; text: root.tr("เปิดเว็บ", "Open web"); onClicked: Qt.openUrlExternally(Plasmoid.configuration.webUrl || root.workspace.webUrl || "https://taskflow-ruddy-one.vercel.app/") }
                }
            }
            Item { visible: !root.workspace.signedIn; Layout.fillHeight: true }
        }
    }
}
