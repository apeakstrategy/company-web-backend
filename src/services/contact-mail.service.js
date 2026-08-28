const transporter=require("../config/mailer");const templates=require("../utils/emailTemplates");
const from=()=>({name:process.env.MAIL_FROM_NAME||"A Peak Strategy",address:process.env.MAIL_FROM_ADDRESS||process.env.MAIL_USER});
exports.sendNotification=(inquiry)=>{const message=templates.notification(inquiry,`${process.env.ADMIN_APP_URL||"http://localhost:5173"}/messages/${inquiry.id}`);return transporter.sendMail({from:from(),to:process.env.CONTACT_NOTIFICATION_TO||process.env.MAIL_USER,replyTo:inquiry.email,...message})};
exports.sendConfirmation=(inquiry)=>transporter.sendMail({from:from(),to:inquiry.email,replyTo:process.env.MAIL_REPLY_ADDRESS||process.env.MAIL_USER,...templates.confirmation(inquiry)});
exports.sendReply=(inquiry,subject,message)=>transporter.sendMail({from:from(),to:inquiry.email,replyTo:process.env.MAIL_REPLY_ADDRESS||process.env.MAIL_USER,...templates.reply(inquiry,subject,message)});
