stop.sh#!/bin/bash
cd /home/ec2-user/backend
npm install
pm2 serve build 5000 --name backend-app
