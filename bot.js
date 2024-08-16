const TelegramBot = require('node-telegram-bot-api');
const cheerio = require('cheerio');

const token = '6890355099:AAFLjvf_8dOeM49Yd_atGRsyrlE5deIwPnw'; // Replace with your own bot token
const bot = new TelegramBot(token, { polling: true });

let waitingForCaptcha = false; // Boolean to track if we're waiting for captcha
let captchaCode = ''; // Variable to store captcha code

async function get_page_html() {
    try {
        const response = await fetch("https://bus-med.1337.ma/", {
            headers: {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "sec-ch-ua": "\"Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"115\", \"Chromium\";v=\"115\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "cookie": "login_state=RR0RPFIMFB6NNIGFG1F9PJK; csrftoken=HBX88n8NSmL19Inu85CUdO8eV92ElUKH; sessionid=tyyjl16gickf0f25ki9x7ahltfq8xnu1",
                "Referer": "https://bus-med.1337.ma/",
                "Referrer-Policy": "same-origin"
            },
            method: "GET"
        });
        return await response.text();
    } catch (err) {
        console.error("Error fetching the page:", err);
    }
}

async function reserv_taxista(capValue, capCode, place) {
    fetch("https://bus-med.1337.ma/create-reservation", {
        headers: {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            "content-type": "application/x-www-form-urlencoded",
            "sec-ch-ua": "\"Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"115\", \"Chromium\";v=\"115\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "cookie": "login_state=RR0RPFIMFB6NNIGFG1F9PJK; csrftoken=HBX88n8NSmL19Inu85CUdO8eV92ElUKH; sessionid=tyyjl16gickf0f25ki9x7ahltfq8xnu1",
            "Referer": "https://bus-med.1337.ma/",
            "Referrer-Policy": "same-origin"
        },
        body: `csrfmiddlewaretoken=WwlywCUcLmbHtkGA5XkWV4hmWqojdZhWtX8wuPSPtyMysSTU3SMGYIfqHpgNoJRt&traget_id=${place}&captcha_0=${capCode}&captcha_1=${capValue}`,
        method: "POST"
    });
}

// Function to send captcha
async function sendCaptcha(chatId) {
    try {
        const html = await get_page_html();
        const captchaRegex = /<img src="\/captchaimage\/([a-f0-9]{40})\/" alt="captcha" class="captcha" \/>/;
        const match = html.match(captchaRegex);

        if (match && match[1]) {
            captchaCode = match[1];
            console.log('Captcha Code:', captchaCode);

            const captchaImageUrl = `https://bus-med.1337.ma/captchaimage/${captchaCode}/`;

            // Send the captcha image to the user
            await bot.sendPhoto(chatId, captchaImageUrl);
            bot.sendMessage(chatId, 'Please enter the captcha value or type /newcaptcha to get a new captcha.');
            
            waitingForCaptcha = true; // Set flag to wait for captcha value
        } else {
            console.error('Captcha code not found.');
            bot.sendMessage(chatId, 'Captcha code not found.');
        }
    } catch (err) {
        console.error("Error fetching the page:", err);
        bot.sendMessage(chatId, 'Error fetching the page.');
    }
}


async function get_place(placeName) {
    try {
        const html = await get_page_html();

        const $ = cheerio.load(html);

        const cards = $('div.card.available');

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];

            const placeElement = $(card).find('.place').text();
            if (placeElement.includes(placeName)) {
                const dataTarget = $(card).find('.interact_container button[data-toggle="modal"]').attr('data-traget');
                if (dataTarget) {
                    return dataTarget; 
                }
            }
        }

        return null;

    } catch (err) {
        console.error("Error fetching the page:", err);
        return null;
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (waitingForCaptcha) {
        if (messageText === '/newcaptcha') {
            await sendCaptcha(chatId); 
        } else {
            const arr = messageText.split(" ");
            bot.sendMessage(chatId, `Will reserve the bus at the next hour`);
        
            const now = new Date();
            const nextHour = new Date(now);
            nextHour.setHours(now.getHours() + 1, 0, 0, 0); 
            const timeToWait = nextHour - now;
        
            setTimeout(async () => {
                const place = await get_place(arr[1]);
                reserv_taxista(arr[0], captchaCode, place);
                waitingForCaptcha = false; 
            }, timeToWait);
        }
        
        return;
    }

    if (messageText === '/getcaptcha') {
        await sendCaptcha(chatId); 
        bot.sendMessage(chatId, 'Welcome to the bot!');
    } else if (messageText === '/newcaptcha') {
        if (waitingForCaptcha) {
            await sendCaptcha(chatId);
        } else {
            bot.sendMessage(chatId, 'You are not currently waiting for a captcha.');
        }
    }
});