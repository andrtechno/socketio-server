# Install
``npm install``


## Tests
``npm test``

## Start all serve-*.js
``npm start``


## Start custom clear server.js
``node server.js``

Socket http://localhost/3000

Admin panel: http://192.168.211.244:3000/admin
Server url http://192.168.211.244:3000


#### Yii2 PHP send
```php
$httpClient = new \yii\httpclient\Client([
    'transport' => 'yii\httpclient\CurlTransport',
    'baseUrl' => 'http://localhost:3000',
]);

$response = $httpClient->post('billing/send_message')
    ->setFormat(Response::FORMAT_JSON)
    ->setData([
        'channel' => 'billing',
        'message' => ['message' => 'My message']
    ])
    ->send();


return ($response->isOk) ? true : false;

```


```php
$key = JWT_SECRET; //env
$payload = [
    'iss' => 'http://example.org',
    'aud' => 'http://example.com',
    'iat' => 1356999524,
    'nbf' => 1357000000
];

$jwt = JWT::encode($payload, $key, 'HS256');
```