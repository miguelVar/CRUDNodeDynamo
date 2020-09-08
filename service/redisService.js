const redis = require('redis');


const clientRedis = redis.createClient({
  url: 'redis://database-redis.v2uw3l.clustercfg.use1.cache.amazonaws.com:6379'
});

clientRedis.on('error', (err) => {
  console.log("Error" + err);
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

const deleteCache = (key, value) =>{
  clientRedis.clean(key);
};

module.exports.responseRedis= responseRedis();
module.exports.setCache=setCache();
module.exports.deleteCache=deleteCache();
