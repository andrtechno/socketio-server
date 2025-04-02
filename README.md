# Install
``npm install``


## Start production
``npm start``

## Start watch
``npm run dev``



``nodemon --legacy-watch index.js``

--inspect: Если ты хочешь отладить приложение, добавь флаг --inspect для запуска Node.js в режиме отладки.

--legacy-watch: Для некоторых файловых систем, например, в Docker или на некоторых версиях macOS, может потребоваться использовать этот флаг для корректной работы watch.




Socket http://localhost/3000

Admin panel: http://192.168.211.244:3000/admin






#### Yii2 PHP send
```php
$key = 'JWT_SECRET';
$payload = [
    'userId' => $user->id,
    'email' => $user->email,
    'first_name' => $user->first_name,
    'last_name' => $user->last_name,
];

$jwt = JWT::encode($payload, $key, 'HS256');

$httpClient = new \yii\httpclient\Client([
    'transport' => 'yii\httpclient\CurlTransport',
    'baseUrl' => 'http://localhost:3000',
]);

$response = $httpClient->post('billing/send')
    ->addHeaders(['Authorization' => 'Bearer '.$jwt])
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
    'id' => $user->id,
    'email' => $user->email,
    'first_name' => $user->first_name,
    'last_name' => $user->last_name,
];

$jwt = JWT::encode($payload, $key, 'HS256');
```