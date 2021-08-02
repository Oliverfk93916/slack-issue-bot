
const axios = require('axios')

const { App } = require('@slack/bolt')

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const customFields = {
	'Low': '1200242243690184',
	'Medium': '1200242243690185',
	'High': '1200242243690186'
}

// Listens to all incoming messages
app.message(async ({ message, say }) => {
	const data = await axios.get(`https://app.asana.com/api/1.0/custom_fields/1200276020945926`,
  	{headers: 
		{Authorization: `Bearer ${process.env.ASANA_TOKEN}`}}	
    )
 	const conversations = data.data.data.enum_options
  	let tsGID = ''
  	let taskID = ''
  	for (let i = 0; i < conversations.length; i++) {
  		if (conversations[i].name == message.thread_ts) {
  			tsGID = conversations[i].name
  			const projectTaskData = await axios.get(`https://app.asana.com/api/1.0/tasks?project=1200242243690180`,	
	  			{headers: 
					{Authorization: `Bearer ${process.env.ASANA_TOKEN}`}
				})
  			const allTasks = projectTaskData.data.data
  			const taskGIDs = allTasks.map(item => {
  				return item.gid
  			})
  			for (let i = 0; i < taskGIDs.length; i++){
  				const taskData = await axios.get(`https://app.asana.com/api/1.0/tasks/${taskGIDs[i]}`,	
	  			{headers: 
					{Authorization: `Bearer ${process.env.ASANA_TOKEN}`}
				})
				if (taskData.data.data.custom_fields[3].display_value == tsGID){
					await axios.post(`https://app.asana.com/api/1.0/tasks/${taskGIDs[i]}/stories`, {data:{
						text: message.text
					}},{
						headers: 
					{Authorization: `Bearer ${process.env.ASANA_TOKEN}`}
					})
					break
				}
  			}
  			break
  		}
  	}

})


// Listens to new Issue Logs
app.message('Issue Form', async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  const user = /\<(.*?)\>/.exec(message.text)[1]
  const groups = message.text.split('*').map((item) => item.trim())
  groups.shift()

  let formSubmission = {}

  for (let i = 0; i < groups.length; i+= 2) {
  	formSubmission[groups[i]] = groups[i+1]
  }

  await say({
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `Hey <${user}>! Would you like to add "${formSubmission['Issue Title']}" "to Asana?`
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Add to Asana"
          },
          "action_id": "button_click"
        }
      }
    ],
    text: {...formSubmission, user:user, ts: message.ts},
  });
});

// Posts new issue log to Asana
app.action('button_click', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();

  const priorityID = '1200242243690183'
  const tsID = '1200276020945926'
  const text = JSON.parse(body.message.text)

  const data = await axios.get(`https://app.asana.com/api/1.0/custom_fields/1200276020945926`,
  	{ headers: 
		{Authorization: `Bearer ${process.env.ASANA_TOKEN}`,}}	
    )
  const conversations = data.data.data.enum_options

  let tsGID = ''
  for (let i = 0; i < conversations.length; i++) {
  	if (conversations[i].name == text.ts) {
  		tsGID = conversations[i].gid
  		break
  	}
  }

  //create enum custom field for ts
  if (tsGID == '') {
  	 const reply = await axios.post(`https://app.asana.com/api/1.0/custom_fields/${tsID}/enum_options`, 
	  	{
	  		data:{
	   		"enabled": false,
	    	"name": text.ts
	  }
	},
	  {
		headers: 
			{Authorization: `Bearer ${process.env.ASANA_TOKEN}`}
	})
  	 tsGID = reply.data.data.gid
	}

  await say(`${text['Issue Title']} added by <${text.user}>`);

  axios.post(`https://app.asana.com/api/1.0/tasks`,{data:{
        	"projects": ["1200242243690180"],
        	"name":text['Issue Title'],
        	"custom_fields": {
        		'1200242243690183': customFields[`${text['Priority?']}`],
        		'1200276020945926': tsGID
        	}
        }
    },
  	{ headers: 
		{Authorization: `Bearer ${process.env.ASANA_TOKEN}`,}}	
    )
});

(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');
})();