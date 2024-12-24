#!/bin/bash
cd /home/ec2-user/backend
npm install
pm2 start index.js --name backend-app
