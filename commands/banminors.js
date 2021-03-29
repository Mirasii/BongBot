module.exports = {
    name: 'banMinors',
    description: 'ban all minors',
    async execute(message, args, bot){
        banMinors(message);
    }
}

function banMinors(message){
    message.guild.members.cache.forEach(member => {
        if(!(member.roles.cache.some(r => r.name === "18+"))){
            member.ban({reason: 'You were bulkBanned lmao sad'})
            .then(console.log)
            .catch(console.error)
        }
    });
}