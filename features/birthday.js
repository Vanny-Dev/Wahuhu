const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Connect to SQLite database
const db = new sqlite3.Database('./database/birthday_list.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the birthday_list database.');
});

// Initialize tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS birthdays (
            user_id TEXT PRIMARY KEY,
            username TEXT,
            birthday DATE
        )
    `);
});

// Helper function to format dates
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Set user birthday
function setBirthday(userId, username, birthday) {
    return new Promise((resolve, reject) => {
        db.run(
            `
            INSERT INTO birthdays (user_id, username, birthday)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                username = excluded.username,
                birthday = excluded.birthday
            `,
            [userId, username, birthday],
            (err) => {
                if (err) return reject(err);
                resolve();
            }
        );
    });
}

// Get today's birthdays
function getTodaysBirthdays() {
    const today = formatDate(new Date());
    return new Promise((resolve, reject) => {
        db.all(
            `
            SELECT username FROM birthdays
            WHERE strftime('%m-%d', birthday) = strftime('%m-%d', ?)
            `,
            [today],
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            }
        );
    });
}

// Get all users' birthdays
function getAllBirthdays() {
    return new Promise((resolve, reject) => {
        db.all(
            `
            SELECT username, birthday FROM birthdays
            ORDER BY strftime('%m-%d', birthday)
            `,
            [],
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            }
        );
    });
}

// Bot ready event
client.once('ready', () => {
    //console.log(`Logged in as ${client.user.tag}!`);
    setInterval(async () => {
        const birthdays = await getTodaysBirthdays();
        if (birthdays.length > 0) {
            const names = birthdays.map((b) => b.username).join(', ');
            const channel = client.channels.cache.find((ch) => ch.name === 'general'); // Replace with your desired channel name
            if (channel) {
                channel.send(`🎉 Happy Birthday to: ${names}! 🎂`);
            }
        }
    }, 24 * 60 * 60 * 1000); // Check once a day
});

// Command handling
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('w!setbirthday')) {
        const userId = message.author.id;
        const username = message.author.username;
        const args = message.content.split(' ')[1];

        if (!args || !/^\d{4}-\d{2}-\d{2}$/.test(args)) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Invalid Format!')
                .setDescription('Please provide a valid date in **YYYY-MM-DD** format.')
                .setTimestamp();
            message.reply({ embeds: [embed] });
            return;
        }

        try {
            await setBirthday(userId, username, args);
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('Birthday Set!')
                .setDescription(`Your birthday has been set to **${args}**. 🎉`)
                .setFooter({ text: 'Thanks for sharing!' })
                .setTimestamp();
            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            message.reply('Failed to set your birthday. Please try again.');
        }
    }

    if (message.content.startsWith('w!birthdays')) {
        try {
            const birthdays = await getTodaysBirthdays();
            if (birthdays.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('No Birthdays Today!')
                    .setDescription('Nobody is celebrating their birthday today. 🎂')
                    .setTimestamp();
                message.reply({ embeds: [embed] });
            } else {
                const names = birthdays.map((b) => `🎉 ${b.username}`).join('\n');
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle("Today's Birthdays!")
                    .setDescription(names)
                    .setFooter({ text: 'Wish them a happy birthday!' })
                    .setTimestamp();
                message.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);
            message.reply('Failed to retrieve birthdays. Please try again.');
        }
    }

    if (message.content.startsWith('w!allbirthdays')) {
        try {
            const allBirthdays = await getAllBirthdays();
            if (allBirthdays.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('No Birthdays Set!')
                    .setDescription('No users have set their birthdays yet. 🎂')
                    .setTimestamp();
                message.reply({ embeds: [embed] });
            } else {
                const birthdayList = allBirthdays
                    .map((b) => `- **${b.username}**: ${b.birthday}`)
                    .join('\n');
                const embed = new EmbedBuilder()
                    .setColor('#0099FF')
                    .setTitle('All Birthdays 🎉')
                    .setDescription(birthdayList)
                    .setFooter({ text: 'Organized by month and day.' })
                    .setTimestamp();
                message.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);
            message.reply('Failed to retrieve the list of all birthdays. Please try again.');
        }
    }

    if (message.content.startsWith('w!help')) {
        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('Birthday Bot Commands')
            .setDescription('Here are the available commands for the Birthday Bot:')
            .addFields(
                { name: 'w!setbirthday <YYYY-MM-DD>', value: 'Set your birthday.' },
                { name: 'w!birthdays', value: 'View today\'s birthdays.' },
                { name: 'w!allbirthdays', value: 'View all users\' birthdays.' },
                { name: 'w!help', value: 'Displays this help message.' }
            )
            .setFooter({ text: 'Use the commands to interact with the Birthday Bot!' })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
