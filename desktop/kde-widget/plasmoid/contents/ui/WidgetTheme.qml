import QtQuick

QtObject {
    property bool dark: true
    property bool glass: true
    property bool reduceMotion: false
    readonly property color surface: dark ? "#101510" : "#f0f3ed"
    readonly property color text: dark ? "#f1efe7" : "#1b231b"
    readonly property color muted: dark ? "#b4bdb0" : "#485440"
    readonly property color accent: dark ? "#b7c3ac" : "#435738"
    readonly property color accentText: dark ? "#1b2418" : "#f5f7f2"
    readonly property color danger: dark ? "#ffa18e" : "#96311f"
    readonly property color field: dark ? "#182018" : "#fafbf8"
    readonly property color fieldBorder: dark ? "#8c9784" : "#5e6c55"
    readonly property color edge: dark ? Qt.rgba(0.9, 0.95, 0.86, 0.16) : Qt.rgba(0.13, 0.2, 0.11, 0.19)
    readonly property int panelRadius: 20
    readonly property int controlRadius: 10
    readonly property int rowRadius: 12
}
