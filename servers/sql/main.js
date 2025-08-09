import mysql from 'mysql2/promise';

export async function db_connect() {
  return mysql.createConnection({
    host: 'vip.tecom.pro',
    user: 'hust_media_sql',
    password: 'Thugiang@xyz',
    database: 'hustmedi_777',
    port: 3306
  });
}