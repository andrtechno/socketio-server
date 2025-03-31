# Install
``npm install``


## Tests
``npm test``

## Start all serve-*.js
``npm start``


## Start custom clear server.js
``node server.js``

open http://localhost/3000





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