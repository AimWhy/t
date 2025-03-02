import QtQuick 2.2
import QtQuick.LocalStorage 2.0

QtObject {
    readonly property string dbMajorVersion: "1"
    readonly property string dbMinorVersion: "1.0"
    property bool initialized: false

    function getDatabase() {
         return LocalStorage.openDatabaseSync("coolretroterm" + dbMajorVersion, dbMinorVersion, "StorageDatabase", 100000)
    }

    function initialize() {
        var db = getDatabase();
        db.transaction(
            function(tx) {
                tx.executeSql('CREATE TABLE IF NOT EXISTS settings(setting TEXT UNIQUE, value TEXT)');
            }
        )

        initialized = true
    }

    function setSetting(setting, value) {
        if(!initialized) initialize();

        var db = getDatabase();
        var res = "";
        db.transaction(
            function(tx) {
                var rs = tx.executeSql('INSERT OR REPLACE INTO settings VALUES (?,?);', [setting,value]);
                //console.log(rs.rowsAffected)
                if (rs.rowsAffected > 0) {
                    res = "OK";
                } else {
                    res = "Error";
                }
           }
      )
      // The function returns “OK” if it was successful, or “Error” if it wasn't
      return res
    }

    function getSetting(setting) {
        if(!initialized) initialize();
        var db = getDatabase();
        var res = "";
        db.transaction(
            function(tx) {
                var rs = tx.executeSql('SELECT value FROM settings WHERE setting=?;', [setting]);
                if (rs.rows.length > 0) {
                res = rs.rows.item(0).value;
                } else {
                res = undefined;
                }
            }
        )
        return res
    }

    function dropSettings(){
        var db = getDatabase();
        db.transaction(
            function(tx) {
                tx.executeSql('DROP TABLE settings');
            }
        )
    }
}
