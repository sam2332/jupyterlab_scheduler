import os

import requests

message = f"Script File: Env_Message:{os.environ.get('Message')}"
url = "https://api.pushover.net/1/messages.json"
requests.post(
    url,
    {
        "token": "ahvv93hyizs2v5tziqwuc5kj5tjvb3",
        "title": "Testing",
        "message": message,
        "priority": 0,
        "sound": "None",
        "user": "gw34qxhu9rjvi6ktear9f9jht2q15h",
        "expire": None,
        "retry": None,
        "callback ": None,
    },
)