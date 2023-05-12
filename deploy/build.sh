#
# Build procedure for the PROD environment
#
#


#
# Function: Check directory
# Check if directory exists, otherwise create it
#
function checkDirectory {

	if [ -d "$1" ]
	then
		printf "OK. $1 Directory exists.\n"
	else
		mkdir $1
		printf "OK. Directory $1 created.\n"
	fi
}

#
# Build the directory structure
#
printf "Building the folder structure...\n"

checkDirectory bundles
checkDirectory ./bundles/hubsql

DEVROOT=..

#
# now copy files to each of these directories
#
printf "Copying hubsql...\n";

cp -v $DEVROOT/bundle/* ./bundles/hubsql
cp -v $DEVROOT/package.json ./bundles/hubsql
cp -v $DEVROOT/deploy/target/config.json ./bundles/hubsql
cp -v $DEVROOT/deploy/target/hubsql.service ./bundles/hubsql

printf "Copying the installer scripts...\n";
cp -v $DEVROOT/deploy/target/install.sh ./bundles 

printf "Building the bundle\n";

cd ./bundles
tar -czvf hubsql.tar.gz *
cd ..

printf "Script end. Available installer kit at ./bundles/hubsql.tar.gz \n"

exit
