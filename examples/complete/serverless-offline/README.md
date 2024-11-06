# Serverless-offline commands

## By AWS Cli invoke:

aws lambda invoke ./app3-logs.txt \
 --endpoint-url http://localhost:3002 \
 --function-name complete-example-dev-app3

## By aws sdk:

node offline-invoke.mjs

## By mocked Rest API

curl http://localhost:3000/dev/helloApp3
