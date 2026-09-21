#!/bin/bash
#
# registration-toggle.sh
# Steuert die Registrierungsfunktion des Schmerztagebuch-Containers
#
# Verwendung: ./registration-toggle.sh [on|off|status]

CONTAINER="paindiary-backend"
SCRIPT="toggle-registration.js"

print_help() {
    echo "Schmerztagebuch – Registrierung ein-/ausschalten"
    echo ""
    echo "Verwendung:"
    echo "  $0 on       Registrierung aktivieren"
    echo "  $0 off      Registrierung deaktivieren"
    echo "  $0 status   Aktuellen Status anzeigen (ohne Änderung)"
    echo ""
    echo "Beispiele:"
    echo "  $0 on"
    echo "  $0 off"
    echo ""
    exit 1
}

# Kein Parameter angegeben
if [ -z "$1" ]; then
    echo "Fehler: Kein Parameter angegeben."
    echo ""
    print_help
fi

case "$1" in
    on)
        echo "Aktiviere Registrierung ..."
        docker exec -it "$CONTAINER" node "$SCRIPT" on
        ;;
    off)
        echo "Deaktiviere Registrierung ..."
        docker exec -it "$CONTAINER" node "$SCRIPT" off
        ;;
    status)
        echo "Aktueller Status:"
        docker exec -it "$CONTAINER" node "$SCRIPT" status
        ;;
    *)
        echo "Fehler: Unbekannter Parameter '$1'."
        echo ""
        print_help
        ;;
esac
