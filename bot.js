import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3000;

// Liste des bots avec leurs tokens, webhooks et noms d'utilisateur depuis .env
const bots = [
    { token: process.env.BOT_TOKEN_1, webhookUrl: process.env.WEBHOOK_URL_1, username: process.env.BOT_USERNAME_1 },
    { token: process.env.BOT_TOKEN_2, webhookUrl: process.env.WEBHOOK_URL_2, username: process.env.BOT_USERNAME_2 },
    { token: process.env.BOT_TOKEN_3, webhookUrl: process.env.WEBHOOK_URL_3, username: process.env.BOT_USERNAME_3 },
    { token: process.env.BOT_TOKEN_4, webhookUrl: process.env.WEBHOOK_URL_4, username: process.env.BOT_USERNAME_4 },
    { token: process.env.BOT_TOKEN_5, webhookUrl: process.env.WEBHOOK_URL_5, username: process.env.BOT_USERNAME_5 },
];

// Vérification des variables d'environnement
bots.forEach((bot, index) => {
    if (!bot.token) {
        console.error(`❌ BOT_TOKEN_${index + 1} manquant dans le fichier .env !`);
        process.exit(1);
    }
    if (!bot.webhookUrl) {
        console.error(`❌ WEBHOOK_URL_${index + 1} manquant dans le fichier .env !`);
        process.exit(1);
    }
    if (!bot.username) {
        console.error(`❌ BOT_USERNAME_${index + 1} manquant dans le fichier .env !`);
        process.exit(1);
    }
});

// Liste des emojis disponibles
const emojis = ['👍', '❤️', '🔥', '👏', '🤩', '🎉', '💯'];

// Délais aléatoires entre 1 et 10 secondes pour humaniser
const getRandomDelay = () => Math.floor(Math.random() * 10000) + 1000;

// Message de démarrage
const startMessage = `
👋 Salut *UserName* ! Je suis un bot de réactions automatiques.

✨ Envoie un message dans un groupe ou un canal où je suis administrateur, et je réagirai avec un emoji aléatoire.
@Reactionxaabot

@breactionxa

@Dbreactioncbot

@Dbreactiondbot

@Dbreactionebot
👉 Utilise les boutons ci-dessous pour m'ajouter à ton groupe ou canal !
`;

app.use(express.json());

// Route de test
app.get('/', (req, res) => {
    res.send('🤖 Bots de réactions actifs !');
});

// Webhook principal pour chaque bot
bots.forEach(bot => {
    app.post(`/webhook${bot.token.split(':')[0]}`, async (req, res) => {
        try {
            const update = req.body;

            // Gère à la fois les messages privés et les messages de canal
            const message = update.message || update.channel_post;

            if (message) {
                const chatId = message.chat.id;
                const messageId = message.message_id;
                const text = message.text || '';
                const hasMedia = message.photo || message.video || message.poll;

                // Commande /start
                if (text === '/start' || text === `/start@${bot.username}`) {
                    const userName = message.chat.type === "private" ? message.from.first_name : message.chat.title;
                    await sendMessage(bot.token, chatId, startMessage.replace('UserName', userName), [
                        [
                            { text: "➕ Add to Channel ➕", url: `https://t.me/${bot.username}?startchannel=botstart` },
                            { text: "➕ Add to Group ➕", url: `https://t.me/${bot.username}?startgroup=botstart` },
                        ],
                        [
                            { text: "Contact the owner", url: "https://t.me/medatt00" },
                        ],
                        [
                            { text: "💝 Support Us - Donate 🤝", url: "https://t.me/bot1reactbot?start=donate" }
                        ]
                    ]);
                }

                // Commande /reactions
                else if (text === '/reactions') {
                    const reactions = emojis.join(", ");
                    await sendMessage(bot.token, chatId, `✅ Enabled Reactions : \n\n${reactions}`);
                }

                // Commande /donate
                else if (text === '/donate' || text === '/start donate') {
                    await sendInvoice(bot.token, chatId, "Donate to Auto Reaction Bot ✨", "Merci pour votre soutien !", '{}', 'donate', 'XTR', [{ label: 'Pay ⭐️1', amount: 1 }]);
                }

                // Réaction aléatoire aux autres messages (texte ou média)
                else if (text || hasMedia) {
                    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                    
                    // Ajout d'un délai aléatoire avant de réagir
                    setTimeout(async () => {
                        try {
                            await sendReaction(bot.token, chatId, messageId, randomEmoji);
                        } catch (error) {
                            console.error('Erreur lors de l\'envoi de la réaction après délai:', error);
                        }
                    }, getRandomDelay());
                }
            }

            // Gestion de la pré-validation du paiement (pre_checkout_query)
            else if (update.pre_checkout_query) {
                await answerPreCheckoutQuery(bot.token, update.pre_checkout_query.id, true);
                await sendMessage(bot.token, update.pre_checkout_query.from.id, "Thank you for your donation! 💝");
            }

            res.sendStatus(200);
        } catch (error) {
            console.error('Erreur dans le webhook:', error);
            res.sendStatus(500);
        }
    });
});

// Fonction d'envoi de message avec clavier
const sendMessage = async (token, chatId, text, keyboard = []) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: keyboard
                },
                disable_notification: true
            })
        });

        const data = await response.json();
        if (!data.ok) console.error('Échec de l\'envoi du message:', data.description);
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
    }
};

// Fonction d'ajout de réaction
const sendReaction = async (token, chatId, messageId, emoji) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/setMessageReaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reaction: [{ type: "emoji", emoji }]
            })
        });

        const data = await response.json();
        if (!data.ok) console.error('Échec de la réaction:', data.description);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la réaction:', error);
    }
};

// Fonction d'envoi de facture (donation)
const sendInvoice = async (token, chatId, title, description, payload, providerToken, currency, prices) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendInvoice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                title: title,
                description: description,
                payload: payload,
                provider_token: providerToken,
                currency: currency,
                prices: prices
            })
        });

        const data = await response.json();
        if (!data.ok) console.error('Échec de l\'envoi de la facture:', data.description);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la facture:', error);
    }
};

// Fonction de réponse à la pré-validation du paiement
const answerPreCheckoutQuery = async (token, preCheckoutQueryId, ok) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pre_checkout_query_id: preCheckoutQueryId,
                ok: ok
            })
        });

        const data = await response.json();
        if (!data.ok) console.error('Échec de la réponse à la pré-validation:', data.description);
    } catch (error) {
        console.error('Erreur lors de la réponse à la pré-validation:', error);
    }
};

// Configuration du webhook pour chaque bot
const setupWebhooks = async () => {
    bots.forEach(async bot => {
        try {
            const webhookUrl = `${bot.webhookUrl}/webhook${bot.token.split(':')[0]}`;
            const response = await fetch(
                `https://api.telegram.org/bot${bot.token}/setWebhook?url=${webhookUrl}&drop_pending_updates=true`
            );

            const data = await response.json();
            console.log(`🔔 Configuration du webhook pour ${bot.username}:`, data.description);
        } catch (error) {
            console.error(`❌ Erreur de configuration du webhook pour ${bot.username}:`, error);
        }
    });
};

// Démarrage du serveur
app.listen(port, () => {
    console.log(`🚀 Serveur en écoute sur le port ${port}`);
    setupWebhooks();
});
