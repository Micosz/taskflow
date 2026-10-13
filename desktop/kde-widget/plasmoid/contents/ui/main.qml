import QtQuick
import QtQuick.Layouts
import org.kde.plasma.plasmoid
import org.kde.plasma.components as PC
import org.kde.kirigami as Kirigami
import "connection.js" as Connection

PlasmoidItem {
    id: root
    width: 380
    height: 430
    property var state: ({signedIn: false, tasks: [], online: false})
    property bool loaded: false
    property bool busy: false
    property string errorMessage: ""
    property bool settingsOpen: false
    property bool thai: Plasmoid.configuration.thai
    property int view: Plasmoid.configuration.view
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
        guard.triggered.connect(function() {
            if (!finished) {
                finished = true; xhr.abort(); root.busy = false;
                root.errorMessage = root.tr("การเชื่อมต่อใช้เวลานาน ลองรีเฟรชอีกครั้ง", "Connection timed out. Try refreshing.");
            }
            guard.destroy();
        });
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== XMLHttpRequest.DONE || finished) return;
            finished = true; guard.stop(); guard.destroy(); root.busy = false;
            try {
                var result = JSON.parse(xhr.responseText);
                if (xhr.status === 200) {
                    root.state = result; root.loaded = true; root.errorMessage = "";
                } else {
                    if (result.state) { root.state = result.state; root.loaded = true; }
                    root.errorMessage = result.error || root.tr("เชื่อมต่อไม่ได้", "Could not connect.");
                }
            } catch (e) {
                root.errorMessage = root.tr("ตัวช่วยยังไม่ทำงาน ลองรันตัวติดตั้งอีกครั้ง", "Companion unavailable. Run the installer again.");
            }
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
        Kirigami.Icon { anchors.fill: parent; source: "view-task" }
        Rectangle {
            visible: root.todayCount > 0
            anchors.right: parent.right; anchors.top: parent.top
            width: badge.implicitWidth + 8; height: badge.implicitHeight + 2; radius: height / 2
            color: Kirigami.Theme.highlightColor
            PC.Label { id: badge; anchors.centerIn: parent; text: root.todayCount; color: Kirigami.Theme.highlightedTextColor; font.pixelSize: 10 }
        }
        MouseArea { anchors.fill: parent; onClicked: root.expanded = !root.expanded }
        PC.ToolTip { text: "TaskFlow · " + root.tr("วันนี้ ", "Today: ") + root.todayCount }
    }
    fullRepresentation: ColumnLayout {
        Layout.minimumWidth: 310
        Layout.minimumHeight: 300
        Layout.preferredWidth: 380
        Layout.preferredHeight: 430
        spacing: Kirigami.Units.smallSpacing

        RowLayout {
            Layout.fillWidth: true
            Kirigami.Icon { source: "view-task"; implicitWidth: 26; implicitHeight: 26 }
            PC.Label { text: "TaskFlow"; font.bold: true; font.pointSize: 15; Layout.fillWidth: true }
            PC.ToolButton {
                text: root.thai ? "EN" : "TH"
                Accessible.name: root.tr("เปลี่ยนเป็นภาษาอังกฤษ", "Switch to Thai")
                onClicked: Plasmoid.configuration.thai = !root.thai
            }
            PC.ToolButton {
                icon.name: "view-refresh"; enabled: !root.busy && root.state.signedIn
                Accessible.name: root.tr("รีเฟรช", "Refresh")
                onClicked: root.request("POST", "/refresh", {})
            }
            PC.ToolButton {
                icon.name: "configure"; Accessible.name: root.tr("ตั้งค่า", "Settings")
                onClicked: root.settingsOpen = !root.settingsOpen
            }
        }
        PC.Label {
            Layout.fillWidth: true; visible: root.errorMessage !== ""
            text: root.errorMessage; textFormat: Text.PlainText; wrapMode: Text.Wrap
            color: Kirigami.Theme.negativeTextColor
        }
        PC.BusyIndicator { visible: root.busy && !root.loaded; running: visible; Layout.alignment: Qt.AlignHCenter }

        ColumnLayout {
            visible: root.settingsOpen
            Layout.fillWidth: true
            PC.Label { text: root.tr("URL เว็บ TaskFlow", "TaskFlow website URL") }
            PC.TextField {
                id: webUrl; Layout.fillWidth: true
                text: Plasmoid.configuration.webUrl || root.state.webUrl || ""
                placeholderText: "https://…"; Accessible.name: root.tr("URL เว็บ TaskFlow", "TaskFlow website URL")
            }
            PC.Button {
                text: root.tr("บันทึก", "Save")
                enabled: /^https?:\/\//.test(webUrl.text)
                onClicked: { Plasmoid.configuration.webUrl = webUrl.text.trim(); root.settingsOpen = false; root.errorMessage = ""; }
            }
            PC.Label { Layout.fillWidth: true; wrapMode: Text.Wrap; text: root.tr("เตือนก่อนส่ง 1 ชั่วโมงเมื่อเปิดเครื่องและออนไลน์", "Reminders start 1 hour before a deadline while this computer is on and online.") }
            PC.Button {
                visible: root.state.signedIn; enabled: !root.busy
                text: root.tr("ออกจากบัญชีบน widget", "Sign out of widget")
                onClicked: root.request("POST", "/logout", {})
            }
        }
        ColumnLayout {
            visible: root.loaded && !root.state.signedIn && !root.settingsOpen
            Layout.fillWidth: true
            PC.Label { Layout.fillWidth: true; wrapMode: Text.Wrap; text: root.tr("เข้าสู่บัญชีเดียวกับเว็บ เพื่อดูงานบนคอม", "Sign in with your TaskFlow account to see your tasks here.") }
            PC.TextField { id: email; Layout.fillWidth: true; placeholderText: "Email"; Accessible.name: "Email"; inputMethodHints: Qt.ImhEmailCharactersOnly }
            PC.TextField {
                id: password; Layout.fillWidth: true; placeholderText: root.tr("รหัสผ่าน", "Password")
                Accessible.name: root.tr("รหัสผ่าน", "Password"); echoMode: TextInput.Password
                onAccepted: loginButton.clicked()
            }
            PC.Button {
                id: loginButton; text: root.tr("เข้าสู่ระบบ", "Sign in")
                enabled: !root.busy && email.text.trim() !== "" && password.text !== ""
                onClicked: {
                    if (!enabled) return;
                    root.request("POST", "/login", {email: email.text.trim(), password: password.text});
                    password.text = "";
                }
            }
            PC.Label {
                Layout.fillWidth: true; wrapMode: Text.Wrap; opacity: 0.7
                text: root.tr("งาน Guest ต้องย้ายขึ้นบัญชีผ่านเว็บก่อน ไม่ต้องเปิดเว็บค้างไว้", "Move guest tasks to your account in the website first. The website can stay closed.")
            }
        }
        ColumnLayout {
            visible: root.state.signedIn && !root.settingsOpen
            Layout.fillWidth: true; Layout.fillHeight: true
            PC.Label { text: root.state.email || ""; textFormat: Text.PlainText; elide: Text.ElideRight; Layout.fillWidth: true; opacity: 0.7 }
            RowLayout {
                Layout.fillWidth: true
                PC.ComboBox {
                    Layout.fillWidth: true
                    model: [root.tr("งานค้างทั้งหมด", "All unfinished"), root.tr("วันนี้", "Today"), root.tr("อีก 7 วัน", "Next 7 days"), root.tr("เลยกำหนด", "Overdue")]
                    currentIndex: root.view
                    Accessible.name: root.tr("กรองงาน", "Filter tasks")
                    onActivated: index => Plasmoid.configuration.view = index
                }
                PC.Label { text: root.visibleTasks.length }
            }
            PC.ScrollView {
                Layout.fillWidth: true; Layout.fillHeight: true
                contentItem: ListView {
                    id: taskList; clip: true; spacing: 6
                    model: root.visibleTasks
                    delegate: Rectangle {
                        required property var modelData
                        width: taskList.width
                        height: taskRow.implicitHeight + 16
                        radius: 8
                        color: Qt.rgba(Kirigami.Theme.textColor.r, Kirigami.Theme.textColor.g, Kirigami.Theme.textColor.b, 0.05)
                        RowLayout {
                            id: taskRow; anchors.fill: parent; anchors.margins: 8
                            PC.ToolButton {
                                icon.name: "checkbox"; enabled: !root.busy && root.state.online
                                Accessible.name: root.tr("ทำเสร็จ: ", "Complete: ") + modelData.title
                                onClicked: root.request("POST", "/complete", {id: modelData.id})
                                PC.ToolTip { text: root.tr("ทำเสร็จ", "Mark complete") }
                            }
                            ColumnLayout {
                                Layout.fillWidth: true; spacing: 2
                                PC.Label { text: modelData.title; textFormat: Text.PlainText; font.bold: true; wrapMode: Text.Wrap; Layout.fillWidth: true }
                                PC.Label { text: modelData.category; textFormat: Text.PlainText; font.pointSize: 9; opacity: 0.65; elide: Text.ElideRight; Layout.fillWidth: true }
                                PC.Label {
                                    text: root.countdown(modelData) + " · " + modelData.due_date + (modelData.due_time ? " " + modelData.due_time.slice(0, 5) : "")
                                    font.pointSize: 9; wrapMode: Text.Wrap; Layout.fillWidth: true
                                    color: root.deadline(modelData) < root.now ? Kirigami.Theme.negativeTextColor : Kirigami.Theme.textColor
                                }
                            }
                        }
                    }
                    PC.Label { anchors.centerIn: parent; visible: taskList.count === 0; text: root.tr("ไม่มีงานในมุมมองนี้", "No tasks in this view") }
                }
            }
            RowLayout {
                Layout.fillWidth: true
                PC.Label {
                    Layout.fillWidth: true; font.pointSize: 9; opacity: 0.65; elide: Text.ElideRight
                    text: root.state.online
                        ? root.tr("ซิงก์แล้ว ", "Synced ") + (root.state.lastSync || "").slice(11, 16)
                        : root.tr("ออฟไลน์ · ข้อมูลล่าสุด ", "Offline · last sync ") + (root.state.lastSync || "—").replace("T", " ")
                }
                PC.Button { text: root.tr("เปิดเว็บ", "Open web"); onClicked: root.openWeb() }
            }
        }
        Item { Layout.fillHeight: true; visible: !root.state.signedIn || root.settingsOpen }
    }
}
