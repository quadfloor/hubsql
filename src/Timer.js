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
import nconf from "nconf";
import fs, { fdatasync } from "fs";

import { log } from "./helper";

import { connect } from "mssql";

const MOVE_DATA_TICKER = 5000;
const CONNECT_TICKER = 10000;

const LOOP_DATE_TIME_FILENAME = "hubsql.dat";

class Timer {
  constructor(sql, hub) {
    this.sql = sql;
    this.hub = hub;

    let conf = nconf.file({ file: __dirname + "/config.json" });

    this.config = conf.get("system");

    if (!this.config)
      throw new Error("Missing config.json file parameter: system");

    this.connect();
    this.loop();
  }

  lastTick = async () => {
    let data = null;

    try {
      data = fs.readFileSync(LOOP_DATE_TIME_FILENAME);
    } catch {
      log("debug", "lastTick", "No file found.");
    }

    return JSON.parse(data);
  };

  resetLastTick = async () => {
    let data = {
      lastTick: Date.now(),
    };

    fs.writeFileSync(LOOP_DATE_TIME_FILENAME, JSON.stringify(data));
  };

  connect = async () => {
    let sqlConnected = this.sql.isConnected();
    let hubConnected = this.hub.isConnected();

    try {
      log("debug", "connect", "Start");

      let sqlSts = null;
      let hubSts = null;

      if (!sqlConnected) sqlConnected = await this.sql.connect();
      else log("debug", "connect", "Sql connected.");

      if (!hubConnected) {
        let status = await this.hub.connect();
        hubConnected = status.status;
      } else log("debug", "connect", "Hub connected.");
    } catch (error) {
      log("error", "connect", error);
    }

    setTimeout(this.connect, CONNECT_TICKER);
  };

  hubUpload = async () => {
    // Enqueue rows to server
    let rows = await this.sql.getRows("tx", "Q");

    if (!rows) {
      log("debug", "hubUpload", "No sql data");
    } else {
      for (const row of rows) {
        try {
          let ret = await this.hub.queue(row);

          if (ret.status) {
            // Set processed
            await this.sql.setRowStatus(
              "tx",
              row.ID,
              ret.data.status,
              ret.data.error
            ); 
          }
        } catch (error) {
          log(
            "error",
            "hubUpload",
            "Error moving row " + row.ID + ": " + error
          );
        }
      }
    }
  };

  hubDownload = async () => {
    let last = await this.lastTick();

    log("debug", "hubDownload", "Last loop date time: " + JSON.stringify(last));

    // First interaction - wait till next loop
    if (!last) {
      await this.resetLastTick();
      return;
    }

    // Dequeue rows from hub
    let ret = await this.hub.dequeue(last.lastTick);

    if (!ret.status) {
      log("error", "hubDownload", "Error getting data");
    } else if (ret.data.length === 0) {
      log("debug", "hubDownload", "No data");
    } else {
      try {
        await this.sql.putRows("rx", ret.data);
        await this.resetLastTick();
      } catch (error) {
        log("error", "hubDownload", "Error putting rows: " + error);
      }
    }
  };

  loop = async () => {
    try {
      log("debug", "loop", "Start");

      if (this.sql.isConnected() && this.hub.isConnected()) {
        //await this.hubUpload();
        await this.hubDownload();
      }
    } catch (error) {
      log("error", "loop", error);
    }

    setTimeout(this.loop, MOVE_DATA_TICKER);
  };
}

export default Timer;
