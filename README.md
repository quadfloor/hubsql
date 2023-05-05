#hubsql

HubSQL

Integration Hub x SQL Server

Used to connect a ERP transfer table in SQL Server to Quadfloor's Industrial Hub Server.

V1 - First implementation

Author: Renato Mendes

Instructions:

To make it work on your environment, needs to add the configuration file at the /src directory:

/src/config.json

{
  "sqlDb": {
    "server": "192.168.1.1",
    "username": "user",
    "password": "pass",
    "port": 1433,
    "database": "DBNAME"
  },
  "hub": {
    "URL": "hub.quadfloor.com",
    "port": 4040,
    "service": "service",
    "login": "login",
    "key": "key"
  },
  "system": "SYSTEM_NAME"
}

IMPORTANT NOTICES:

** 
- REQUIRES MINIMAL NODE V18 TO RUN PROPERLY - UNDER 18 HAS NO FETCH LIBRARIES


- MAKE SURE QUADFLOOR HUB IS CONFIGURED AND YOU HAVE VALID CREDENTIALS BEFORE QUEUEING/DEQUEING MESSAGE. A VALID CONTRACT/LICENSE NEEDED TO USE QUADFLOOR HUB SERVER.

- PLEASE CONTACT QUADFLOOR SUPPORT BEFORE INTEGRATION EFFORT
**

