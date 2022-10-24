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

import { log } from "./helper";
import { config } from "./config";

class Hub {
  constructor() {
    this.jwtToken = null;
  }

  isConnected = () => {
    return this.jwtToken !== null;
  }

  getToken = async () => {
    let params = {
      company: config.hub.company,
      key: config.hub.key,
    };

    let url = new URL("http://" + config.hub.address + "/v1.0/token");
    for (const p in params) url.searchParams.append(p, params[p]);

    log("debug", "hub.token", "Getting token at " + url);

    let response = await fetch(url, {
      method: "GET",
    });

    if (response.status !== 200) {
      let msg = await response.text();
      log("debug", "hub.token", "Failed to retrieve token: " + msg);
      this.jwtToken = null;

      return false;
    } else {
      let data = await response.json();
      log("debug", "hub.token", "Token retrieved successfully.");

      if (data.jwtToken) {
        this.jwtToken = data.jwtToken;
        return true;
      }

      return false;
    }

    return false;
  };

  get = async (method, params) => {
    let query = new URLSearchParams(params);
    let url =
      "http://" +
      config.hub.address +
      "/v1.0/" +
      method +
      (query ? "?" + query : "");

    log("debug", "hub.get", url);

    let response = await fetch(url, {
      method: "GET",
      headers: new Headers({
        Authorization: "Bearer " + this.jwtToken,
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(params),
    });

    if (response.status !== 200) {
      log("error", "hub.get", "Error getting data at " + url);

      // Unauthorized lead to a new connection request
      if (response.status === 401) this.jwtToken = null;

      return false;
    }

    let data = response.json();

    return data;
  };

  post = async (method, params, data) => {
    let query = new URLSearchParams(params);

    let url =
      "http://" +
      config.hub.address +
      "/v1.0/" +
      method +
      (query ? "?" + query : "");

    log("debug", "hub.post", "URL: " + url + " Data: " + JSON.stringify(data));

    let response = await fetch(url, {
      method: "POST",
      headers: new Headers({
        Authorization: "Bearer " + this.jwtToken,
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(data),
    });

    if (response.status !== 200) {
      log("error", "hub.post", "Error posting data at " + url);

      // Unauthorized lead to a new connection request
      if (response.status === 401) this.jwtToken = null;

      return false;
    }

    return true;
  };

  connect = async () => {
    try {
      log("info", "hub.connect", "Connecting to Quadfloor Hub...");

      await this.getToken();

      if (this.jwtToken) {
        log("info", "hub.connect", "Quadfloor Hub connected...");
        return true;
      }

      log("info", "hub.connect", "Quadfloor Hub connection error...");
      return false;
    } catch (error) {
      log("error", "hub.connect", "Cannot connect to Quadfloor Hub.");
      log("error", "hub.connect", error);

      this.jwtToken = null;

      return false;
    }

    return false;
  };

  queue = async (row) => {
    let data = {
      id: row.ID,
      source: row.SOURCE,
      destination: row.DESTINATION,
      type: row.TYPE,
      version: row.VERSION,
      data: row.DATA,
      status: row.STATUS,
      error: row.ERROR,
      queuedAt: row.QUEUEDAT,
      processedAt: row.PROCESSEDAT,
      deletedAt: row.DELETEDAT,
    };

    return this.post("queue", null, data);
  };
}

export default Hub;
