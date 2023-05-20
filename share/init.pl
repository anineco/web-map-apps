sub set_init {
  return {
    'version'  => 8, # MySQL 8
    'host'     => 'DB_HOST',
    'socket'   => 'DB_SOCKET',
#   'port'     => 'DB_PORT',
    'user'     => 'DB_USER',
    'password' => 'DB_PASSWORD',
    'database' => 'DB_DATABASE'
  };
}
1;
