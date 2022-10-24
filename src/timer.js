/*************************************************************************
 *
 * QUADFLOOR CONFIsNTIAL
 * __________________
 *
 *  (c) 2012-2022 QuadFloor
 *  www.quadfloor.com
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Quadfloor. The intellectual and technical concepts
 * contained herein are proprietary to Quadfloor
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Quadfloor.
 *
 */

import { log } from "./helper";

import { config } from "./config";
import { connect } from "mssql";

const MOVE_DATA_TICKER = 5000;
const CONNECT_TICKER = 10000;

class Timer {
  constructor(sql, hub) {
    this.sql = sql;
    this.hub = hub;

    this.connect();
    this.moveData();
  }

  connect = async () => {
    let sqlConnected = this.sql.isConnected();
    let hubConnected = this.hub.isConnected();

    try {
      log("debug", "connect", "Start");

      let sqlSts = null;
      let hubSts = null;

      if (!sqlConnected) sqlConnected = await this.sql.connect();
      else log("debug", "connect", "Sql connected.");

      if (!hubConnected) hubConnected = await this.hub.connect();
      else log("debug", "connect", "Hub connected.");
    } catch (error) {
      log("error", "connect", error);
    }

    setTimeout(this.connect, CONNECT_TICKER);
  };

  sqlRowsToHub = async () => {
    // Enqueue rows to server
    let rows = await this.sql.getRowsWithStatus("Q");

    if (!rows) {
      log("debug", "sqlToHub", "No sql data");
    } else {
      for (const row of rows) {
        try {
          let sts = await this.hub.queue(row);
          if (sts) await this.sql.setRowStatus(row.ID, "P"); // Set processed
        } catch (error) {
          log("error", "sqlToHub", "Error moving row " + row.ID + ": " + error);
        }
      }
    }
  };

  checkHubDoneRows = async () => {
    // Dequeue rows from server
    let { sts, data } = await this.hub.dequeue("D");

    console.log("HERE!!!!!!!!!!")
    console.log(sts)
    console.log(data)

    if (!sts) log("debug", "hubToSql", "No rows to dequeue");

    log("error", "moveData", error);


    for (const row of data) {
      try {
        let sts = await this.sql.setRowStatus(row.sourceId, "D");
      } catch (error) {
        log(
          "error",
          "checkHubDoneRows",
          "Error queueing row " + row.ID + ": " + error
        );
      }
    }
  };

  moveData = async () => {
    try {
      log("debug", "moveData", "Start");

      if (this.sql.isConnected() && this.hub.isConnected()) {
        this.sqlRowsToHub();
        this.checkHubDoneRows();
      }
    } catch (error) {
      log("error", "moveData", error);
    }

    setTimeout(this.moveData, MOVE_DATA_TICKER);
  };
}

export default Timer;
