import QtQuick

Timer {
    id: recovery
    property int attempts: 0
    property int initialDelay: 2000
    property int maximumDelay: 15000
    signal retry()
    repeat: false
    function failed() {
        // Retry only a read of /state. Never replay a login or a write.
        interval = Math.min(maximumDelay, initialDelay * Math.pow(2, Math.min(attempts, 4)));
        attempts += 1;
        restart();
    }
    function recovered() {
        stop();
        attempts = 0;
    }
    onTriggered: retry()
}
