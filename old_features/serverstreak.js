const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const PREFIX = 'w!';
// Connect to SQLite database
const db = new sqlite3.Database('./database/streaks.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the streaks database.');
});

// Create streaks table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS streaks (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        current_streak INTEGER DEFAULT 0,
        last_check_in TIMESTAMP
    )
`);

client.on('ready', () => {
    //console.log(`🤖 Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Handle `w!checkin`
    if (command === 'checkin') {
        const userId = message.author.id;
        const username = message.author.username;
        const now = Date.now();

        db.get('SELECT * FROM streaks WHERE user_id = ?', [userId], (err, row) => {
            if (err) {
                console.error(err);
                return message.reply('❌ Error accessing streak data.');
            }

            if (row) {
                const lastCheckIn = new Date(row.last_check_in);
                const timeDiff = now - lastCheckIn.getTime();

                if (timeDiff < 86400000) {
                    return message.reply('✅ You already checked in today!');
                } else if (timeDiff < 172800000) {
                    const updatedStreak = row.current_streak + 1;
                    db.run(
                        'UPDATE streaks SET current_streak = ?, last_check_in = ? WHERE user_id = ?',
                        [updatedStreak, now, userId]
                    );
                    return message.reply(`🌟 Streak maintained! Your current streak: **${updatedStreak} days**.`);
                }
            }

            // New check-in or reset
            db.run(
                'INSERT INTO streaks (user_id, username, current_streak, last_check_in) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET current_streak = 1, last_check_in = ?',
                [userId, username, 1, now, now]
            );
            message.reply('🌟 Streak started! Keep checking in daily!');
        });
    }

    // Handle `w!leaderboard`
    if (command === 'leaderboard') {
        db.all('SELECT username, current_streak FROM streaks ORDER BY current_streak DESC LIMIT 10', [], (err, rows) => {
            if (err) {
                console.error(err);
                return message.reply('❌ Error fetching leaderboard data.');
            }

            if (rows.length === 0) {
                return message.reply('📉 No streaks to display yet! Start checking in now!');
            }

            const leaderboard = rows
                .map((row, index) => `${index + 1}. **${row.username}** - ${row.current_streak} days`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('🏆 Streak Leaderboard')
                .setDescription(leaderboard)
                .setFooter({ text: 'Check in daily to climb the ranks!' });

            message.reply({ embeds: [embed] });
        });
    }
});

// Login your bot
client.login(process.env.TOKEN);
