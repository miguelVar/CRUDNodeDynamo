'use strict';
const serverless = require('serverless-http');
const express = require('express');
const app = express();
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const redis = require('redis');

const USERS_TABLE = process.env.USERS_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDB;

const clientRedis= redis.createClient(6379,'db-redis.97uprv.clustercfg.use2.cache.amazonaws.com');
clientRedis.on('error',(err)=>{
    console.log("Error" + err);
});

if (IS_OFFLINE === 'true') {
    dynamoDB = new AWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://localhost:8000'
    });
} else {
    dynamoDB = new AWS.DynamoDB.DocumentClient();
}

app.use(bodyParser.urlencoded({extend: true}));

app.get('/', (req, res) => {
    res.send('Hola mundo desde express')
});

app.post('/users', (req, res) => {
    const {userId, name} = req.body;
    const params = {
        TableName: USERS_TABLE,
        Item: {
            userId, name
        }
    };
    dynamoDB.put(params, (error) => {
        if (error) {
            console.log(error);
            res.status(400).json({
                error: 'No se ha podido crear el usuario'
            })
        } else {
            res.json({userId, name});
        }
    });
    res.json({userId, name})
});

app.get('/users', (req, res) => {
    const userskey = 'user:data';
    const params = {
        TableName: USERS_TABLE,
    };
    return clientRedis.get(userskey, (err, users) => {
        if (users) {
            return res.json({
                success: true,
                message: 'Usuarios cargados correctamente',
                users: JSON.parse(users)
            })
        } else {
            dynamoDB.scan(params, (error, result) => {
                if (error) {
                    console.log(error);
                    res.status(400).json({
                        error: 'No se ha podido acceder a los usuarios'
                    })
                } else {
                    const {Items} = result;
                    clientRedis.set(userskey, 3600, JSON.stringify(Items));
                    res.json({
                        success: true,
                        message: 'Usuarios cargados correctamente',
                        users: Items
                    });
                }
            });
        }
    })
});

app.get('/users/:userId', (req, res) => {
    const params = {
        TableName: USERS_TABLE,
        Key: {
            userId: req.params.userId,
        }
    };

    dynamoDB.get(params, (error, result) => {
        if (error) {
            console.log(error);
            res.status(400).json({
                error: 'No se ha podido acceder al usuario'
            })
        }
        if (result.Item) {
            const {userId, name} = result.Item;
            return res.json({userId, name})
        } else {
            res.status(404).json({
                error: 'Usuario no encontrado'
            })
        }
    })
});


module.exports.generic = serverless(app);
