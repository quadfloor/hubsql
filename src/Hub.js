/*************************************************************************
 *
 * QUADFLOOR CONFIDENTIAL
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
import qs from "qs";

import { log } from "./helper";

class Hub {
  constructor() {
    this.jwtToken = null;
    let conf = nconf.file({ file: __dirname + "/config.json" });

    this.config = conf.get("hub");

    if (
      !this.config.URL ||
      !this.config.port ||
      !this.config.login ||
      !this.config.key
    )
      throw new Error(
        "Missing config.json parameters: parametros hub.address, hub.port, hub.login e hub.key"
      );
  }

  isConnected = () => {
    return this.jwtToken !== null;
  };

  getToken = async () => {
    let query = {
      login: this.config.login,
      key: this.config.key,
    };

    let url = new URL(
      "http://" + this.config.URL + ":" + this.config.port + "/api/v1.0/token"
    );
    for (const p in query) url.searchParams.append(p, query[p]);

    log("debug", "hub.token", "Getting token at " + url);

    let response = await fetch(url, {
      method: "GET",
    });

    if (response.status !== 200) {
      let msg = await response.text();
      log("debug", "hub.token", "Failed to retrieve token: " + msg);
      this.jwtToken = null;

      return { status: false, data: null };
    } else {
      let data = await response.json();
      log("debug", "hub.token", "Token retrieved successfully.");

      if (data.jwtToken) {
        this.jwtToken = data.jwtToken;
        return { status: true, data: data.jwtToken };
      }

      return { status: false, data: null };
    }

    return { status: false, data: null };
  };

  connect = async () => {
    try {
      log("info", "hub.connect", "Connecting to Quadfloor Hub...");

      await this.getToken();

      if (this.jwtToken) {
        log("info", "hub.connect", "Quadfloor Hub connected...");
        return { status: true, data: null };
      }

      log("info", "hub.connect", "Quadfloor Hub connection error...");
      return { status: false, data: null };
    } catch (error) {
      log("error", "hub.connect", "Cannot connect to Quadfloor Hub.");
      log("error", "hub.connect", error);

      this.jwtToken = null;

      return { status: false, data: null };
    }
  };

  get = async (method, query) => {
    let q = qs.stringify(query);

    let url =
      "http://" +
      this.config.URL +
      ":" +
      this.config.port +
      "/api/v1.0/mq/" +
      this.config.service +
      "/" +
      method +
      (q ? "?" + q : "");

    log("debug", "hub.get", "URL: " + url);

    let ret = {
      status: false,
      data: null,
    };

    try {
      let response = await fetch(url, {
        method: "GET",
        headers: new Headers({
          Authorization: "Bearer " + this.jwtToken,
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      });

      if (response.status !== 200) {
        log("error", "hub.get", "Error getting data at " + url);

        // Unauthorized lead to a new connection request
        if (response.status === 401) {
          this.jwtToken = null;
        }
      } else {
        ret.data = await response.json();
        ret.status = true;
      }

      log("debug", "hub.get", "Status: " + ret.status);
      log("debug", "hub.get", "Data: " + JSON.stringify(ret.data));
    } catch (error) {
      log("error", "hub.get", error);
      this.jwtToken = null;
    }

    return ret;
  };

  put = async (method, query, body) => {
    let q = qs.stringify(query);

    let url =
      "http://" +
      this.config.URL +
      ":" +
      this.config.port +
      "/api/v1.0/mq/" +
      this.config.service +
      "/" +
      method +
      (q ? "?" + q : "");

    log("debug", "hub.put", "URL: " + url + " Body: " + JSON.stringify(body));

    let ret = {
      status: false,
      data: null,
    };

    try {
      let response = await fetch(url, {
        method: "PUT",
        headers: new Headers({
          Authorization: "Bearer " + this.jwtToken,
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      });

      if (response.status !== 200) {
        log("error", "hub.put", "Error putting data at " + url);

        // Unauthorized lead to a new connection request
        if (response.status === 401) {
          this.jwtToken = null;
        }
      } else {
        ret.data = await response.json();
        ret.status = true;
      }
    }
    catch (error) {
      log("error", "hub.put", error);
      this.jwtToken = null;
    }

    return ret;
  };

  queue = async (row) => {
    let body = {
      id: row.ID,
      source: row.SOURCE,
      destination: row.DESTINATION,
      type: row.TYPE,
      version: row.VERSION,
      data: row.DATA,
      status: row.STATUS,
      error: row.ERROR,
    };

    return await this.put("queue", null, body);
  };

  dequeue = async (lastDateTime) => {
    let query = {
      dateTime: lastDateTime
    };

    return await this.get("dequeue", query);
  };
}

export default Hub;
