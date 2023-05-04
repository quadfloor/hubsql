import Sql from "./Sql";
import Hub from "./Hub";
import Timer from "./Timer";

const execSqlTask = async (sql, fnc) => {
  await sql.connect();
  await fnc();
  process.exit(0);
};

if (process.env.NODE_ENV.startsWith("development"))
  console.log("Starting development environment");
else console.log("Starting production environment");

console.log(`Quadfloor HubSql mirror agent started`);

let args = process.argv;
if (args.length === 2) console.log(`No arguments passed`);

if (
  args[2] === "-h" ||
  args[2] === "-help" ||
  args[2] === "--help" ||
  args[2] === "--h"
) {
  console.log("Arguments:");
  console.log(
    "--create-sql-tables: Create the system sql tables according to the configuration file."
  );
  console.log(
    "--drop-sql-tables: Drop the system sql tables according to the configuration file."
  );
  console.log("--clean-queues: Delete records from TX and RX queues.");
  console.log("--insert-tx-rows: Insert SQL side test rows on its TX queue.");
  console.log("--insert-rx-rows: Insert SQL side test rows on its RX queue.");
  console.log("--list-tx-rows: List rows on its TX queue.");
  console.log("--list-rx-rows: List rows on its RX queue.");
  process.exit(0);
}

let sql = new Sql();
let hub = new Hub();

let fnc = null;

switch (args[2]) {
  case "--create-sql-tables":
    fnc = sql.createTables;
    break;

  case "--drop-sql-tables":
    fnc = sql.dropTables;
    break;

  case "--clean-queues":
    fnc = sql.cleanQueues;
    break;

  case "--insert-tx-rows":
    fnc = sql.insertTestRows.bind(null, "tx");
    break;

  case "--insert-rx-rows":
    fnc = sql.insertTestRows.bind(null, "rx");
    break;

  case "--list-tx-rows":
    fnc = sql.listRows.bind(null, "tx");
    break;

  case "--list-rx-rows":
    fnc = sql.listRows.bind(null, "rx");
    break;
}

if (fnc) {
  execSqlTask(sql, fnc);
} else {
  let timer = new Timer(sql, hub);
}
