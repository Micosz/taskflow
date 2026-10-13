import QtQuick
import QtQuick.Layouts
import org.kde.plasma.components as PC
import org.kde.kirigami as Kirigami

PC.Button {
    id: control
    required property QtObject theme
    property bool primary: false
    property bool selected: false
    property bool compact: false
    property string tip: ""
    implicitHeight: compact ? 32 : 38
    implicitWidth: Math.max(compact ? 32 : 68, contentItem.implicitWidth + leftPadding + rightPadding)
    leftPadding: compact ? 8 : 12
    rightPadding: leftPadding
    hoverEnabled: true
    opacity: enabled ? 1 : 0.5
    // A passive handler distinguishes pointer presses from Space/Enter on a focused button.
    property bool pointerInput: false
    TapHandler {
        gesturePolicy: TapHandler.DragThreshold
        onPressedChanged: { if (pressed) control.pointerInput = true; }
    }
    Keys.onPressed: event => { control.pointerInput = false; event.accepted = false; }
    scale: down && pointerInput && !theme.reduceMotion ? 0.98 : 1
    Behavior on scale {
        enabled: !control.theme.reduceMotion && control.pointerInput
        NumberAnimation { duration: 120; easing.type: Easing.BezierSpline; easing.bezierCurve: [0.23, 1, 0.32, 1, 1, 1] }
    }
    contentItem: RowLayout {
        spacing: 6
        Kirigami.Icon {
            visible: control.icon.name !== ""
            source: control.icon.name
            implicitWidth: 16; implicitHeight: 16
            color: control.primary ? control.theme.accentText : control.theme.text
            Layout.alignment: Qt.AlignVCenter
        }
        PC.Label {
            visible: control.text !== ""
            text: control.text; textFormat: Text.PlainText
            color: control.primary ? control.theme.accentText : control.theme.text
            font.pixelSize: control.compact ? 12 : 13
            font.weight: control.primary || control.selected ? Font.DemiBold : Font.Normal
            horizontalAlignment: Text.AlignHCenter
            elide: Text.ElideRight
            Layout.fillWidth: true
        }
    }
    background: Rectangle {
        radius: control.theme.controlRadius
        color: control.primary ? control.theme.accent
            : control.selected ? Qt.rgba(control.theme.accent.r, control.theme.accent.g, control.theme.accent.b, 0.16)
            : control.hovered || control.down ? Qt.rgba(control.theme.text.r, control.theme.text.g, control.theme.text.b, 0.09)
            : "transparent"
        border.width: control.activeFocus || (!control.compact && !control.primary) ? 1 : 0
        border.color: control.activeFocus ? control.theme.accent : control.theme.edge
    }
    PC.ToolTip { text: control.tip }
}
