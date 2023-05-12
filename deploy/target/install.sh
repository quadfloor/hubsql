printf "Copying files...\n"

mkdir -p ~/bin
cp ./hubsql/hubsql.js ~/bin
cp ./hubsql/package.json ~/bin
cp ./hubsql/config.json ~/bin
cd ~/bin

printf "Installing packages...\n"
npm install

printf "Copying systemd files...\n"
\cp -r hubsql/hubsql.service /lib/systemd/system/

printf "Make monit start on boot...\n"
systemctl daemon-reload
systemctl enable hubsql
systemctl start hubsql
