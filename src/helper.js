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

const DEBUG = false;

export const getDateStr = () => {
  const date = new Date();

  return date.toLocaleString("en-US", { hour12: false });
};

export const log = (type, fnc, message) => {
  if (type === "debug" && !DEBUG) return;

  let preffix = "ERROR";
  if (type === "info") preffix = "INFO";
  if (type === "debug") preffix = "DEBUG";

  console.log(type.toUpperCase() + ": " + getDateStr() + " - " + fnc + " - " + message);
};
