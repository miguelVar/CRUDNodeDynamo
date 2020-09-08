'use strict';
const serverless = require('serverless-http');
const express = require('express');
const app = express();
const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const redis = require('redis');
const TIME_VALUE=60;
const userskey = 'users';

const USERS_TABLE = process.env.USERS_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDB;

/**
 *
 * @type {RedisClient}
 */
const clientRedis = redis.createClient({
    url: 'redis://database-redis.v2uw3l.clustercfg.use1.cache.amazonaws.com:6379'
});

clientRedis.on('error', (err) => {
    console.log("Error" + err);
});

/**
 * Validate environment
 */
if (IS_OFFLINE === 'true') {
    dynamoDB = new AWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://localhost:8000'
    });
} else {
    dynamoDB = new AWS.DynamoDB.DocumentClient();
}

app.use(bodyParser.urlencoded({extend: true}));

/**
 * Petitions HTTP
 */
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

const getCache = async (req, res, next) => {
    return await responseRedis(userskey, req, res, next);
};

app.get('/users',(req, res) => {
    const params = {
        TableName: USERS_TABLE,
    };
    dynamoDB.scan(params, (error, result) => {
        if (error) {
            console.log(error);
            res.status(400).json({
                error: 'No se ha podido acceder a los usuarios'
            })
        } else {
            const {Items} = result;
            // setCache(userskey, Items);
            res.json({
                success: true,
                message: 'Usuarios cargados correctamente',
                users: Items
            });
        }
    });
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

const responseRedis = async (userskey, req, res, next) => {
    return await clientRedis.get(userskey, (err, data) => {
        console.log(err,data);
        if (err){
            next();
        }
        if (data != null){
            console.log("Leyendo desde cache");
            res.send(JSON.parse(data));
        }else{
            console.log("Llamado servicio real");
            next();
        }
    });
};

const setCache = (key, value) =>{
  clientRedis.setex(key,TIME_VALUE,JSON.stringify(value));
};
// const cleanCache = (key)=>{
//   clientRedis.clean(key);
// };

module.exports.generic = serverless(app);
