import QtQuick
import QtQuick.Effects

Item {
    id: glass
    required property QtObject theme
    property Item wallpaper: null
    property point wallpaperPosition: Qt.point(0, 0)
    readonly property bool canBlur: theme.glass && wallpaper !== null && GraphicsInfo.api !== GraphicsInfo.Software

    function updatePosition() {
        if (!canBlur) return;
        var point = mapToItem(wallpaper, 0, 0);
        if (point.x !== wallpaperPosition.x || point.y !== wallpaperPosition.y) wallpaperPosition = point;
    }
    onWidthChanged: updatePosition()
    onHeightChanged: updatePosition()
    onWallpaperChanged: updatePosition()
    // mapToItem is not a reactive binding. Keep the sampled area aligned after desktop dragging.
    Timer { interval: 200; running: glass.visible && glass.canBlur; repeat: true; onTriggered: glass.updatePosition() }
    ShaderEffectSource {
        id: sample
        anchors.fill: parent
        sourceItem: glass.canBlur ? glass.wallpaper : null
        sourceRect: Qt.rect(glass.wallpaperPosition.x, glass.wallpaperPosition.y, glass.width, glass.height)
        textureSize: Qt.size(Math.max(1, glass.width / 2), Math.max(1, glass.height / 2))
        hideSource: false
        live: glass.canBlur
        visible: false
    }
    Rectangle {
        id: mask
        anchors.fill: parent
        radius: glass.theme.panelRadius
        color: "white"
        layer.enabled: glass.canBlur
        visible: false
    }
    MultiEffect {
        anchors.fill: parent
        visible: glass.canBlur
        source: sample
        blurEnabled: true
        blurMax: 20
        blur: 0.8
        autoPaddingEnabled: false
        maskEnabled: true
        maskSource: mask
    }
    Rectangle {
        anchors.fill: parent
        radius: glass.theme.panelRadius
        color: Qt.rgba(glass.theme.surface.r, glass.theme.surface.g, glass.theme.surface.b,
                       glass.canBlur ? (glass.theme.dark ? 0.82 : 0.88) : 1.0)
        border.width: 1
        border.color: glass.theme.edge
    }
    Rectangle {
        anchors.left: parent.left; anchors.right: parent.right; anchors.top: parent.top
        anchors.leftMargin: glass.theme.panelRadius; anchors.rightMargin: glass.theme.panelRadius
        anchors.topMargin: 1
        height: 1
        color: Qt.rgba(glass.theme.text.r, glass.theme.text.g, glass.theme.text.b, 0.10)
    }
}
