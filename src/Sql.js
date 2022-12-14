import mssql from "mssql";
import nconf from "nconf";

import { log } from "./helper";

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

const SQL_TEST_DATA =
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

const SQL_RX_TABLE = "QFRX";
const SQL_TX_TABLE = "QFTX";

const SQL_TABLE_XML_DATA = {
  MATERIAL$POST:
    '<?xml version="1.0" encoding="UTF-8" ?> \
      <root> \
        <NOME>MATERIAL TESTE DE INTEGRACAO</NOME> \
        <CODIGO_MATERIAL>MATERIAL TESTE</CODIGO_MATERIAL> \
        <DESCRICAO>DESCRICAO DO MATERIAL TESTE DE INTEGRACAO</DESCRICAO> \
        <TIPO>MATERIA_PRIMA</TIPO> \
        <FAMILIA>FAMILIA TESTE</FAMILIA> \
        <UNIDADE>KG</UNIDADE> \
        <PESO_UNITARIO_BRUTO>123,45</PESO_UNITARIO_BRUTO> \
        <PESO_UNITARIO_LIQUIDO>678,90</PESO_UNITARIO_LIQUIDO> \
        <RASTREABILIDADE>LOTE</RASTREABILIDADE> \
        <VALIDADE>12</VALIDADE> \
      </root>',
  STRUCTURE_ITEM_STATUS$POST:
    '<?xml version="1.0" encoding="UTF-8" ?> \
  <root> \
    <CODIGO_MATERIAL>MATERIAL TESTE</CODIGO_MATERIAL> \
    <CODIGO_MATERIAL_PAI>MATERIAL TESTE PAI</CODIGO_MATERIAL_PAI> \
    <QUANTIDADE>987,65</QUANTIDADE> \
    <QUANTIDADE_COM_PERDA>432,10</QUANTIDADE_COM_PERDA> \
    <ATIVO>SIM</ATIVO>  \
  </root>',
  LOCATION$POST:
    '<?xml version="1.0" encoding="UTF-8" ?> \
  <root> \
    <NOME>LOCAL TESTE DE INTEGRACAO</NOME> \
    <CODIGO_LOCAL>LOCAL TESTE</CODIGO_LOCAL> \
    <DESCRICAO>DESCRICAO DO LOCAL TESTE DE INTEGRACAO</DESCRICAO> \
  </root>',
  INVENTORY$POST:
    '<?xml version="1.0" encoding="UTF-8" ?> \
  <root> \
    <CODIGO_MATERIAL>MATERIAL TESTE</CODIGO_MATERIAL> \
    <CODIGO_LOCAL>LOCAL TESTE</CODIGO_LOCAL> \
    <SALDO>123,45</SALDO> \
    <LOTE>LABC123</LOTE> \
    <DATA_VALIDADE>01/01/2024</DATA_VALIDADE> \
  </root>',
};

class Sql {
  constructor() {
    this.conn = null;

    let conf = nconf.file({ file: __dirname + "/config.json" });

    this.config = conf.get("sqlDb");

    if (
      !this.config.server ||
      !this.config.username ||
      !this.config.password ||
      !this.config.port ||
      !this.config.database
    )
      throw new Error(
        "Missing config.json parameters: sqlDb.server, sqlDb.username, sqlDb.password, sqlDb.port, sqlDb.database"
      );
  }

  isConnected = () => {
    return this.conn !== null;
  };

  connect = async () => {
    try {
      var cfg = {
        server: this.config.server,
        authentication: {
          type: "default",
          options: {
            userName: this.config.username,
            password: this.config.password,
          },
        },
        options: {
          encrypt: true,
          enableArithAbort: true,
          integratedSecurity: true,
          trustServerCertificate: true,
          rowCollectionOnDone: true,
          database: this.config.database,
          cryptoCredentialsDetails: {
            // Required for SQL Server 2012 connection,
            // as node 18 uses a newer TLS protocol
            minVersion: "TLSv1",
          },
        },
      };

      log("debug", "Sql.connect", "Connecting to Sql...");
      log("debug", "Sql.connect", "Configuration: " + JSON.stringify(cfg));

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

      let rxStmt =
        "IF NOT EXISTS (SELECT * FROM SYSOBJECTS WHERE NAME='" +
        SQL_RX_TABLE +
        "' and XTYPE='U') CREATE TABLE " +
        SQL_RX_TABLE +
        " " +
        SQL_TABLE_DEFS +
        ";";

      await this.query(rxStmt);
      console.log("info", "Sql.createTables", SQL_RX_TABLE + " table created");

      let txStmt = rxStmt.replaceAll(SQL_RX_TABLE, SQL_TX_TABLE);
      await this.query(txStmt);
      console.log("info", "Sql.createTables", SQL_TX_TABLE + " table created");
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

      let rxStmt = "DROP TABLE " + SQL_RX_TABLE;

      await this.query(rxStmt);
      console.log("info", "Sql.dropTables", SQL_RX_TABLE + " table drop");

      let txStmt = rxStmt.replaceAll(SQL_RX_TABLE, SQL_TX_TABLE);
      await this.query(txStmt);
      console.log("info", "Sql.dropTables", SQL_TX_TABLE + " table drop");
    } catch (error) {
      log("error", "Sql.dropTables", "Error dropping tables...");
      log("error", "Sql.dropTables", error);

      this.conn = null;
    }
  };

  insertTestRows = async (queue) => {
    try {
      if (!this.conn) {
        log(
          "error",
          "Sql.insertTestRows",
          "Cannot insert rows - no connection."
        );
        return;
      }

      let table = queue === "tx" ? SQL_TX_TABLE : SQL_RX_TABLE;

      let insertStmt =
        "INSERT INTO " +
        table +
        " " +
        SQL_TABLE_FIELDS +
        " VALUES " +
        SQL_TEST_DATA;

      let types =
        queue === "tx"
          ? ["MATERIAL$POST", "STRUCTURE_ITEM_STATUS$POST", "LOCATION$POST", "INVENTORY$POST"]
          : ["PRODUCTION_ORDER$POST", "PRODUCTION_REPORT$POST", "CONSUMPTION$POST"];

      for (const type of types) {
        let stmt = insertStmt
          .replaceAll("@type", type)
          .replaceAll("@data", SQL_TABLE_XML_DATA[type]);

        await this.query(stmt);
        console.log("info", "Sql.insertTestRows", table + " row inserted");
      }
    } catch (error) {
      log("error", "Sql.insertTestRows", "Error inserting test rows...");
      log("error", "Sql.insertTestRows", error);

      this.conn = null;
    }
  };

  listRows = async (queue) => {
    try {
      if (!this.conn) {
        log("error", "Sql.listRows", "Cannot list rows - no connection.");
        return;
      }

      let rows = await this.getRows(queue);

      for (const row of rows) {
        console.log(row);
      }

      log("info", "Sql.listRows", rows.length + " rows listed.");
    } catch (error) {
      log(
        "error",
        "Sql.listRows",
        "Error listing rows at " + queue + " queue..."
      );
      log("error", "Sql.listRows", error);

      this.conn = null;
    }
  };

  // Get from SQL side (TX or RX queue on SQL system)
  getRows = async (queue, status) => {
    try {
      if (!this.conn) {
        log("debug", "Sql.getRows", "Cannot get sql data - no connection.");
        return;
      }

      let table = queue === "tx" ? SQL_TX_TABLE : SQL_RX_TABLE;

      let stmt = "SELECT * FROM  " + table;

      if (status) stmt += " WHERE STATUS='" + status + "'";

      stmt += " ORDER BY ID ASC";

      let data = await this.query(stmt);

      let rows = data.recordsets[0];
      log(
        "debug",
        "Sql.getRows",
        table + " data received: " + rows.length + " records."
      );

      return rows;
    } catch (error) {
      log(
        "error",
        "Sql.getRows",
        "Error getting sql side data from sql " + queue + " queue..."
      );
      log("error", "Sql.getRows", error);

      this.conn = null;
    }
  };

  putRows = async (queue, rows) => {
    try {
      if (!this.conn) {
        log("error", "Sql.putRows", "Cannot put rows - no connection.");
        return;
      }

      if (!rows) {
        log("error", "Sql.putRows", "Cannot put rows - no data.");
        return;
      }

      let table = queue === "tx" ? SQL_TX_TABLE : SQL_RX_TABLE;

      for (const row of rows) {
        let data = [
          row.source,
          row.destination,
          row.type,
          row.version,
          row.data,
          row.status,
          row.error,
          "CURRENT_TIMESTAMP",
          "NULL",
          "NULL",
        ];

        let insertStmt =
          "INSERT INTO " +
          table +
          " " +
          SQL_TABLE_FIELDS +
          " VALUES " +
          data.join(",") +
          ",";

        await this.query(stmt);
        console.log("info", "Sql.putRows", table + " row inserted");
      }
    } catch (error) {
      log("error", "Sql.putRows", "Error putting rows...");
      log("error", "Sql.putRows", error);

      this.conn = null;
    }
  };

  // Set the row as queued at SQL side (TX or RX queue on SQL system)
  setRowStatus = async (queue, id, status, error) => {
    try {
      if (!this.conn) {
        log(
          "debug",
          "Sql.setRowStatus",
          "Cannot get sql data - no connection."
        );
        return;
      }

      let errorStmt = error ? "'" + error + "'" : "NULL";

      let table = queue === "tx" ? SQL_TX_TABLE : SQL_RX_TABLE;

      let stmt =
        "UPDATE " +
        table +
        " SET STATUS = '" +
        status +
        "', ERROR = " +
        errorStmt +
        " WHERE ID = '" +
        id +
        "'";

      let sts = await this.query(stmt);

      log(
        "debug",
        "Sql.setRowStatus",
        table + " rows affected: " + sts.rowsAffected
      );

      return sts.rowsAffected === 1;
    } catch (error) {
      log(
        "error",
        "Sql.setRowStatus",
        "Error setting " + table + " queue row status..."
      );
      log("error", "Sql.setRowStatus", error);

      this.conn = null;
    }

    return false;
  };
}

export default Sql;
