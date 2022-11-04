import mssql from "mssql";

import { log } from "./helper";
import { config } from "./config";

const SQL_TABLE_DEFS =
  "( \
    ID INT PRIMARY KEY IDENTITY (1,1), \
    SOURCE VARCHAR(32) NOT NULL, \
    DESTINATION VARCHAR(32) NOT NULL, \
    TYPE VARCHAR(32) NOT NULL, \
    VERSION VARCHAR(8) NOT NULL, \
    DATA VARCHAR(8000), \
    STATUS VARCHAR(1), \
    ERROR VARCHAR(4096), \
    QUEUEDAT DATETIME NOT NULL, \
    PROCESSEDAT DATETIME, \
    DELETEDAT DATETIME \
)";

const SQL_TABLE_FIELDS =
  "( \
  SOURCE, \
  DESTINATION, \
  TYPE, \
  VERSION, \
  DATA, \
  STATUS, \
  ERROR, \
  QUEUEDAT, \
  PROCESSEDAT, \
  DELETEDAT \
)";

const SQL_TABLE_TEST_DATA =
  "( \
  'TOTVS', \
  'QUADFLOOR', \
  '@type', \
  '1', \
  '@data', \
  'Q', \
  NULL, \
  CURRENT_TIMESTAMP, \
  NULL, \
  NULL \
)";

const SQL_TABLE_XML_DATA = {
  WORKCENTER$PUT:
    '<?xml version="1.0" encoding="UTF-8" ?> \
      <root> \
        <name>WORKCENTER TEST</name> \
        <description>WORKCENTER TEST DESCRIPTION</description> \
      </root>',
    MATERIAL$PUT: 
    '<?xml version="1.0" encoding="UTF-8" ?> \
      <root> \
        <name>WORKCENTER TEST</name> \
        <description>WORKCENTER TEST DESCRIPTION</description> \
      </root>',
    INVENTORY$PUT:
    '<?xml version="1.0" encoding="UTF-8" ?> \
      <root> \
        <name>WORKCENTER TEST</name> \
        <description>WORKCENTER TEST DESCRIPTION</description> \
      </root>',
};

class Sql {
  constructor() {
    this.conn = null;
  }

  isConnected = () => {
    return this.conn !== null;
  };

  connect = async () => {
    try {
      var cfg = {
        server: config.sqlDb.server,
        authentication: {
          type: "default",
          options: {
            userName: config.sqlDb.username,
            password: config.sqlDb.password,
          },
        },
        options: {
          encrypt: true,
          enableArithAbort: true,
          integratedSecurity: true,
          trustServerCertificate: true,
          rowCollectionOnDone: true,
          database: config.sqlDb.database,
          cryptoCredentialsDetails: {
            // Required for SQL Server 2012 connection,
            // as node 18 uses a newer TLS protocol
            minVersion: "TLSv1",
          },
        },
      };

      log("debug", "Sql.connect", "Connecting to Sql...");

      this.conn = await mssql.connect(cfg);

      if (this.conn) log("info", "Sql.connect", "SQL Server connected...");

      return true;
    } catch (error) {
      log("error", "Sql.connect", "Cannot connect to SQL database.");
      log("error", "Sql.connect", error);

      this.conn = null;

      return false;
    }

    return false;
  };

  query = async (stmt) => {
    log("debug", "Sql.query", stmt);
    let sts = await mssql.query(stmt);
    log("debug", "Sql.query", JSON.stringify(sts));
    return sts;
  };

  createTables = async () => {
    try {
      if (!this.conn) {
        log(
          "error",
          "Sql.createTables",
          "Cannot create tables - no connection."
        );
        return;
      }

      let rx = config.sqlDb.database + "_RX";
      let tx = config.sqlDb.database + "_TX";

      let rxStmt =
        "IF NOT EXISTS (SELECT * FROM SYSOBJECTS WHERE NAME='" +
        rx +
        "' and XTYPE='U') CREATE TABLE " +
        rx +
        " " +
        SQL_TABLE_DEFS +
        ";";

      await this.query(rxStmt);
      console.log("info", "Sql.createTables", rx + " table created");

      let txStmt = rxStmt.replaceAll(rx, tx);
      await this.query(txStmt);
      console.log("info", "Sql.createTables", tx + " table created");
    } catch (error) {
      log("error", "Sql.createTables", "Error creating tables...");
      log("error", "Sql.createTables", error);

      this.conn = null;
    }
  };

  dropTables = async () => {
    try {
      if (!this.conn) {
        log("error", "Sql.dropTables", "Cannot drop tables - no connection.");
        return;
      }

      let rx = config.sqlDb.database + "_RX";
      let tx = config.sqlDb.database + "_TX";

      let rxStmt = "DROP TABLE " + rx;

      await this.query(rxStmt);
      console.log("info", "Sql.dropTables", rx + " table drop");

      let txStmt = rxStmt.replaceAll(rx, tx);
      await this.query(txStmt);
      console.log("info", "Sql.dropTables", tx + " table drop");
    } catch (error) {
      log("error", "Sql.dropTables", "Error dropping tables...");
      log("error", "Sql.dropTables", error);

      this.conn = null;
    }
  };

  insertTestRows = async () => {
    try {
      if (!this.conn) {
        log(
          "error",
          "Sql.insertTestRows",
          "Cannot insert rows - no connection."
        );
        return;
      }

      let tx = config.sqlDb.database + "_TX";

      let insertStmt =
        "INSERT INTO " +
        tx +
        SQL_TABLE_FIELDS +
        " VALUES " +
        SQL_TABLE_TEST_DATA;

      const types = ["MATERIAL$PUT", "WORKCENTER$PUT", "INVENTORY$PUT"];

      for (const type of types) {
        let stmt = insertStmt.replaceAll("@type", type).replaceAll("@data", SQL_TABLE_XML_DATA[type]);

        await this.query(stmt);
        console.log("info", "Sql.insertTestRows", tx + " row inserted");
      }
    } catch (error) {
      log("error", "Sql.insertTestRows", "Error inserting test rows...");
      log("error", "Sql.insertTestRows", error);

      this.conn = null;
    }
  };

  // Get from SQL side (TX queue on SQL system)
  getRowsWithStatus = async (status) => {
    try {
      if (!this.conn) {
        log(
          "debug",
          "Sql.getRowsWithStatus",
          "Cannot get sql data - no connection."
        );
        return;
      }

      let rx = config.sqlDb.database + "_TX";

      let rxStmt =
        "SELECT * FROM  " +
        rx +
        " WHERE STATUS='" +
        status +
        "' ORDER BY ID ASC";

      let data = await this.query(rxStmt);

      let rows = data.recordsets[0];
      log(
        "debug",
        "Sql.getRowsWithStatus",
        rx + " data received: " + rows.length + " records."
      );

      return rows;
    } catch (error) {
      log(
        "error",
        "Sql.getRowsWithStatus",
        "Error getting sql side data from sql tx queue..."
      );
      log("error", "Sql.getRowsWithStatus", error);

      this.conn = null;
    }
  };

  // Set the row as queued at SQL side (TX queue on SQL system)
  setRowStatus = async (id, status) => {
    try {
      if (!this.conn) {
        log(
          "debug",
          "Sql.setRowStatus",
          "Cannot get sql data - no connection."
        );
        return;
      }

      let rx = config.sqlDb.database + "_TX";

      let rxStmt =
        "UPDATE " +
        rx +
        " SET STATUS = '" +
        status +
        "' WHERE ID = '" +
        id +
        "'";

      let sts = await this.query(rxStmt);

      log(
        "debug",
        "Sql.setRowStatus",
        rx + " rows affected: " + sts.rowsAffected
      );

      return sts.rowsAffected === 1;
    } catch (error) {
      log("error", "Sql.setRowStatus", "Error setting tx queue row status...");
      log("error", "Sql.setRowStatus", error);

      this.conn = null;
    }

    return false;
  };
}

export default Sql;
