import QtQuick
import org.kde.plasma.components as PC

PC.TextField {
    id: field
    required property QtObject theme
    implicitHeight: 40
    color: theme.text
    placeholderTextColor: theme.muted
    selectionColor: theme.accent
    selectedTextColor: theme.accentText
    font.pixelSize: 13
    leftPadding: 12; rightPadding: 12
    background: Rectangle {
        radius: field.theme.controlRadius
        color: field.theme.field
        border.width: 1
        border.color: field.activeFocus ? field.theme.accent : field.theme.fieldBorder
    }
}
