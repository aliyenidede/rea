**Yeah, we good.**

0:17

17 seconds

Okay, folks, we're at capacity. Let's kick off. I don't want you waiting here for 25 more minutes before we some

0:24

24 seconds

arbitrary deadline. So, welcome. My name is Matt. Uh I'm a teacher and I suppose

0:31

31 seconds

now I teach AI. Um we have a link up here if you've not already been to this which is has the

0:39

39 seconds

exercises for the um stuff we're going to do today. This is going to be around two hours. So we might just sort of kick off two hours from now. Is that right Mike?

0:48

48 seconds

Yeah. Perfect. Um, and the theory behind this talk or at least the thesis under which I've been operating for the last

0:55

55 seconds

kind of six months or so is that we all think that AI is a new paradigm,

1:01

1 minute, 1 second

right? AI is obviously changing a lot of things. You guys are obviously interested in this and that's why you've come to this talk. And

1:09

1 minute, 9 seconds

I feel that when we talk about AI being a new paradigm, we forget that actually

1:17

1 minute, 17 seconds

software engineering fundamentals, the stuff that's really crucial to working with humans, also works super well with

1:24

1 minute, 24 seconds

AI. And this is what my keynote is on tomorrow. Really, I'm going to sort of be fleshing that out a lot more. And in this workshop, I'm hopefully going to be

1:32

1 minute, 32 seconds

able to direct your attention to those things and uh hopefully show you that I'm right, but we'll see. Um, can I get

1:41

1 minute, 41 seconds

a quick heads up first? How many of you guys um are coding have ever coded with AI? Raise your hand if you've ever coded

1:48

1 minute, 48 seconds

with AI. Perfect. Okay. Uh, keep your hand raised.

1:53

1 minute, 53 seconds

Uh, let's all uh share those armpits with the world. Um, how many of you code every day with AI?

2:01

2 minutes, 1 second

Cool. Okay. Uh, ra keep your hand raised if you've ever been frustrated with AI.

2:08

2 minutes, 8 seconds

Okay. Very good. You can put your hands down. Thank you for that show of obedience. I really appreciate that. Um,

2:14

2 minutes, 14 seconds

we are also being live streamed to the Gilgood room as well. I've not uh did we send someone up to the Gilgood room to just check they're okay? Don't know. But

2:22

2 minutes, 22 seconds

I see you. Uh, and there is a way that you can participate which is we have the um a Q&A. We're going to be doing kind I

2:30

2 minutes, 30 seconds

have a sort of hatred of Q&As's because they're not very democratic. The mostly the sort of um most talkative people get

2:36

2 minutes, 36 seconds

to um get to participate and share. And so we're going to be going through this um QA here. So why do we have to wait till 3:45? The room is packed. The doors

2:45

2 minutes, 45 seconds

are closed. 100% agree. And so if you want to uh ask a question, we're going to be I would like you to pile into this async and then we can vote on each

2:53

2 minutes, 53 seconds

other's questions and hopefully get the best question surface so the for the entire room to enjoy.

3:00

3 minutes

So I want to talk about first the kind of weird constraints that LLMs have and

3:07

3 minutes, 7 seconds

those weird constraints are sort of what we have to base a lot of our work around. Now,

3:14

3 minutes, 14 seconds

there's a guy called Dex Hy who runs a company called Human Layer, and he came up with this idea, which is that

3:21

3 minutes, 21 seconds

when you're working with LLMs, they have a smart zone and a dumb zone. When you're first kind of like working with

3:30

3 minutes, 30 seconds

an LM and it's like you just started a new conversation, you start from nothing. That's when the LLM is going to do its best work because in that

3:37

3 minutes, 37 seconds

situation, the attention relationships are the least strained. Every time you add a token to an LLM, it's kind of like you're adding a team to a football

3:45

3 minutes, 45 seconds

league. You think of the number of matches that get added every time you add a team to a football league. It just go scales quadratically. And that's

3:54

3 minutes, 54 seconds

because you have attention relationships going from essentially each token to the other that are positional and the sort of meaning of the individual token. And so this means that by around sort of 40%

4:05

4 minutes, 5 seconds

or around I would say around 100k is kind of my new marker for this because it doesn't matter whether you're using 1 million uh context window or 200k. It's always going to be about this.

4:17

4 minutes, 17 seconds

It starts to just get dumber. So as you continually keep adding stuff to the same context window, it just gets dumber

4:25

4 minutes, 25 seconds

and dumber until it's making kind of stupid decisions. Raise your hand if that feels familiar to you. Yeah. Cool.

4:31

4 minutes, 31 seconds

So this means that we kind of want to size our tasks in a way that sticks within the smart zone, right? We don't

4:39

4 minutes, 39 seconds

want the AI to bite off more than it can chew. And this goes back to old advice like Martin Fowler in refactoring uh

4:46

4 minutes, 46 seconds

like uh the pragmatic programmer talks about this. Don't bite off more than you can chew. Keep your tasks small so that you as a developer, a human developer

4:55

4 minutes, 55 seconds

don't freak out and don't start acting and going into the dumb zone.

5:01

5 minutes, 1 second

But how do you tackle big tasks? How do you take a large task like I don't know cloning a company or something or just

5:09

5 minutes, 9 seconds

doing something crazy? And how do you break it into small tasks so they all fit into the dumb zone? One way of

5:16

5 minutes, 16 seconds

course you could do is I mean kind of what the AI companies maybe want you to do or the natural way of doing it is just keep going and going and going. You end up in the dumb zone charging you

5:24

5 minutes, 24 seconds

tons of tokens per request. You then compact back down. We'll talk about compacting properly in a minute. And you keep going, keep going, keep going,

5:32

5 minutes, 32 seconds

compact back down, keep going, keep going, keep going. And I think that's doesn't really work very well because the more sediment, we'll talk about that in a minute. So the theory here is then,

5:43

5 minutes, 43 seconds

and this is what I was doing for a while, is I would use these kind of multi-phase plans where I would say,

5:50

5 minutes, 50 seconds

okay, we have this sort of number four thing here, this large large task. Let's break it down into small sections so that we can then kind of chunk it up and

5:59

5 minutes, 59 seconds

do each little bit of work in the smart zone. Raise your hand if you've ever used a multi-phase plan before. Yeah,

6:06

6 minutes, 6 seconds

really common practice, right? This is kind of how we've been doing it.

6:09

6 minutes, 9 seconds

Certainly, this is how I was doing it up until December last year really.

6:14

6 minutes, 14 seconds

And any developer worth their salt will look at this and go, "This is a loop,

6:19

6 minutes, 19 seconds

right? This is a loop. We've just got phase one, phase two, phase three, phase four. Why don't we just have phase n,

6:27

6 minutes, 27 seconds

right? Phase n where we essentially just say,

6:31

6 minutes, 31 seconds

okay, we have, let's say, a plan operating in the background and then we just loop over the top of it and we go through until it's complete. And this is

6:39

6 minutes, 39 seconds

where um raise your hand if you've heard of Ralph Wiggum as a software practice.

6:44

6 minutes, 44 seconds

Okay, cool. Raise your hand if you've not heard of Ralph Wigum as a software practice. Actually, that's more like it.

6:48

6 minutes, 48 seconds

Okay. So there's this idea called Ralph Wigum uh which is kind of um sort of based on this which is essentially

6:56

6 minutes, 56 seconds

all you need to do is sort of specify the end of the journey where you just say okay we create a PRD a product requirements document to say okay let's

7:05

7 minutes, 5 seconds

describe where we're going and then we just say to the AI just make a small change make a small change that gets us closer and closer to there and Ralph

7:14

7 minutes, 14 seconds

works okay but I prefer a little bit more structure so that's kind where we got to in terms of thinking about the smart zone. And that's kind of where I

7:23

7 minutes, 23 seconds

want you to first start thinking about here. Another weird constraint of LLM is LLM are kind of like the guy from Momento, right? They just continually

7:32

7 minutes, 32 seconds

forget. They could just keep resetting back to the base state. Let me pull up this diagram.

7:38

7 minutes, 38 seconds

I sort of I I I really should use slides, but I just prefer just like randomly scrolling around a infinite uh TL draw canvas. Thank you, Steve.

7:48

7 minutes, 48 seconds

Um,

7:49

7 minutes, 49 seconds

so let's say another concept I want you to have is that every session with an LLM kind of goes through the same stages. You have first of all the system

7:57

7 minutes, 57 seconds

prompt here. This gray box here is essentially the stuff that's always in your context. You want this to be as

8:04

8 minutes, 4 seconds

small as possible because if you have a ton of stuff in here, if you have 250k tokens, like I have seen people put in there, then that you're just going to go

8:13

8 minutes, 13 seconds

straight into the dumb zone without even being able to do anything. So you want this to be tiny. You then go into a kind

8:20

8 minutes, 20 seconds

of exploratory phase. This blue is sort of where the coding agent is going out and exploring the codebase. Then you go into implementation and then you go into

8:29

8 minutes, 29 seconds

testing and kind of making sure that it works, running your feedback loops and things like this. Raise your hand if that feels familiar based on what you've

8:36

8 minutes, 36 seconds

done. Yep. Sort of the like the the main cornerstones of any session. And when you clear the context, you go right back

8:45

8 minutes, 45 seconds

to the system prompt. Bof, you go right back there. So you delete everything that's come before.

8:51

8 minutes, 51 seconds

And raise your hand if you've heard of compacting as well. Yeah. Okay. There are some people who've not heard of compacting. So let's just quickly show

8:59

8 minutes, 59 seconds

what that means. For instance, I've just been having a little chat with my LLM.

9:06

9 minutes, 6 seconds

Uh, I want to make sure we sort of, you know, just cover the basics so we're all sort of on the same wavelength here.

9:12

9 minutes, 12 seconds

I've just been having a chat with my LLM. I've been talking about a thing that I want to build. How's the font size? Should I bump it up? Folks in the back. Bump bump bump bump bump.

9:24

9 minutes, 24 seconds

I'm using claw code for this session, but you don't need to use claw code. Uh,

9:28

9 minutes, 28 seconds

in fact, it's often nice not to use claw code. Um, so I've been having a chat with the LM just sort of planning out what I'm going to do next. It's asking

9:35

9 minutes, 35 seconds

me a bunch of questions and I can I highly recommend you do this. There's this tiny little status line here that

9:43

9 minutes, 43 seconds

tells me how many tokens I'm using. The exact number of tokens I'm using. Um I have a article on my website AI Hero if

9:50

9 minutes, 50 seconds

you want to copy this. This is oh wow that is that shakes doesn't it? Um, this is essential information on every coding

9:59

9 minutes, 59 seconds

session because you need to know exactly how many tokens you're using so that you know how close you are to the dump zone.

10:05

10 minutes, 5 seconds

Absolutely essential. And so let's watch it. So I've got two options. I can either clear and go back to nothing or I can compact.

10:15

10 minutes, 15 seconds

And when I compact then it's going to squeeze all of that conversation which admittedly isn't very much into a much

10:22

10 minutes, 22 seconds

smaller space. And this in diagram terms kind of looks like this where you take all of the information from the session

10:29

10 minutes, 29 seconds

and you essentially create a history out of it, a written record of what happened.

10:36

10 minutes, 36 seconds

And devs love compacting for some reason, but I hate it. I much prefer my AI to behave like the guy from Momento because this state is always the same.

10:48

10 minutes, 48 seconds

Always the same. Every time you do it,

10:49

10 minutes, 49 seconds

you clear and you go back to the beginning. And so if you're able to do that and you're able to optimize for that, then you're in a great spot.

10:56

10 minutes, 56 seconds

So that's kind of the two things I want you to think about with LLM, the two constraints that we're working with. They have a smart zone and a dumb zone.

11:04

11 minutes, 4 seconds

And they're like the guy from Momento.

11:06

11 minutes, 6 seconds

So let's take a look at the first exercise. And I'm while I'm doing this,

11:11

11 minutes, 11 seconds

the way I want this to work is I'm going to sort of show you how um I'm going to be sort of walking through it up here.

11:17

11 minutes, 17 seconds

And I want you folks to be kind of like tapping away and doing things as well. So that was just a little lecture bit.

11:23

11 minutes, 23 seconds

Let's now actually get and do some coding. For anyone who arrived late or anyone in the Gilgood room, uh go to this link,

11:32

11 minutes, 32 seconds

this link up here to see the exercises and clone the repo.

11:38

11 minutes, 38 seconds

You absolutely do not have to. You can just watch me do it if you fancy it. But let's go there myself and let's see what exercises await us.

11:45

11 minutes, 45 seconds

So essentially, I've built a um this is from my course. This is a uh a course management platform essentially a kind

11:54

11 minutes, 54 seconds

of CMS for instructors for students and this is what we're going to be building a feature in. So I'm going to take you from essentially the idea for the

12:02

12 minutes, 2 seconds

feature all the way up to building a PRD for the feature all the way up to implementing the feature and hopefully you can take inspiration from this

12:10

12 minutes, 10 seconds

process and use it in your own work. So uh let's kick off. episode.

12:17

12 minutes, 17 seconds

We're going to start by using a skill which is very close to my heart. It's the grill me skill. And this grill me

12:24

12 minutes, 24 seconds

skill is wonderfully small, wonderfully tiny. And it helps prevent one of I think the main issues when you're

12:32

12 minutes, 32 seconds

working with an AI, which is misalignment.

12:37

12 minutes, 37 seconds

The uh the sort of silent idea that I'm talking against here, that I'm arguing against is the specs to code movement.

12:45

12 minutes, 45 seconds

Has anyone heard of the specs to code movement? Raise your hand. It's not really a movement. I suppose it's just sort of people saying specs to code. Um,

12:53

12 minutes, 53 seconds

what it is is people say, okay, you can write a program or you want to build an app. The best way to build that app is to take some specifications.

13:02

13 minutes, 2 seconds

So to write some sort of like document and then turn that document into code.

13:09

13 minutes, 9 seconds

So just turn it into code. How do you do that? You pass it to AI. if there's something wrong with the resulting code.

13:14

13 minutes, 14 seconds

You don't look at the code, you look back at the specs, you change the specs and you sort of just keep going like this. This is kind of like vibe coding

13:22

13 minutes, 22 seconds

by another name where you're essentially ignoring the code. You don't need to worry about the code. You just sort of keep editing the specs and eventually

13:29

13 minutes, 29 seconds

you just keep going. And I tried this. I really tried it and it sucks. It doesn't work because you need to keep a handle

13:36

13 minutes, 36 seconds

on the code. You need to understand what's in it. You need to shape it because the code is your battleground.

13:41

13 minutes, 41 seconds

And so this again is where we're going. Let's let's get some exercises. So what I'd like you to do is go to this page, the

13:49

13 minutes, 49 seconds

the grill me skill. And inside the repo here, we have a Slack message

13:57

13 minutes, 57 seconds

from our pal. Where is it? It's in the root of the repo. And it's under where is it?

14:07

14 minutes, 7 seconds

Clientbrief.mmd. It's a Slack message from Sarah Chin.

14:11

14 minutes, 11 seconds

For some reason, the Claude always chooses Sarah Chen as the name. I don't know why. Um, it's saying that in Cadence, our um course platform, our retention numbers are not great.

14:21

14 minutes, 21 seconds

Students sign up, do a few lessons, then they drop off. I'd love to add some gamification to the platform. And so,

14:27

14 minutes, 27 seconds

when you're presented with an idea like this, you need to find some way of turning it into reality. Let's say Sarah Chen is your client. You're on a tight budget. You need to get this done fast.

14:35

14 minutes, 35 seconds

How do you go and do it? Um, raise your hand if you would. um enter plan mode when you're doing this. Anyone a big

14:43

14 minutes, 43 seconds

user of plan mode? Yep. Um let's actually shout out quickly any other ideas about what you would do with this or raise your hand if you what would be your first port of call.

14:54

14 minutes, 54 seconds

Yeah, sorry.

15:00

15 minutes

Yes, exactly. Let's imagine that Sarah Chen's gone on hold. You have no idea, right? Uh she's just posted this thing. You need to action it before you go.

15:07

15 minutes, 7 seconds

Well, my first protocol is I go for this particular skill. I'm going to clear my context.

15:15

15 minutes, 15 seconds

I'm going to uh get rid of you. You don't need to be there. And I'm going to say

15:22

15 minutes, 22 seconds

um I'm going to invoke a skill, which is the grill me skill. Let's quickly check.

15:28

15 minutes, 28 seconds

Raise your hands if you don't know what this is.

15:32

15 minutes, 32 seconds

Cool. Oh, sorry. Sorry. Let me be more specific. Raise your hands if you don't know what I'm doing here when I uh do a forward slash and then type something.

15:42

15 minutes, 42 seconds

Anyone everyone kind of understand what that is? I'm invoking a skill. I'm invoking the grill me skill. And what I'm going to do is I'm going to say

15:49

15 minutes, 49 seconds

grill me and I'm going to pass in the client brief.

15:54

15 minutes, 54 seconds

So now the LLM really has only a couple of things here. It just has the skill and it has the description of what I want to do.

16:04

16 minutes, 4 seconds

And this is virtually how I start every piece of work with AI. And while it's exploring the codebase,

16:11

16 minutes, 11 seconds

I'm just going to show you what the grill me skill does. So this is inside the repo so you can check it out. It's extremely short. Interview me

16:20

16 minutes, 20 seconds

relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies one by one. For each question, provide

16:29

16 minutes, 29 seconds

your recommended answer. Ask the questions one at a time. uh blah blah blah. What this does, and what I noticed

16:36

16 minutes, 36 seconds

when I was working with AI, especially in plan mode actually, is it would really eagerly try to produce a plan for

16:44

16 minutes, 44 seconds

me. It would say, "Okay, I think I've got enough. I'm just goof plan."

16:49

16 minutes, 49 seconds

And what I found was that I was really trying to find the words for this for for what I wanted instead

16:57

16 minutes, 57 seconds

of that. And Frederick P. Brooks in the design of design he has a great quote uh talking about the design concept when

17:06

17 minutes, 6 seconds

you're working on something new with someone when you're uh all trying to build something together then there's this shared idea that's

17:14

17 minutes, 14 seconds

shared between all participants and that is the design concept and that's what I realized I needed with Claude I needed

17:22

17 minutes, 22 seconds

I needed to reach a shared understanding I didn't need an asset I didn't need a plan I needed to be on the same wavelength as the AI as my agent. And

17:31

17 minutes, 31 seconds

this is an extremely effective way of doing it. So hopefully there we go.

17:35

17 minutes, 35 seconds

Nice. It has done its exploration. First of all, it's invoked a sub agent which spent uh 97 93.7K tokens on Opus.

17:47

17 minutes, 47 seconds

Um and it's asked me the first question.

17:51

17 minutes, 51 seconds

Cool. We can see that even though the sub agent burned a ton of tokens, I haven't actually um uh increased my

17:58

17 minutes, 58 seconds

token usage that much. Raise your hand if you don't know what sub aents are.

18:02

18 minutes, 2 seconds

It's an important question. Everyone kind of clear what sub aents are? Okay,

18:06

18 minutes, 6 seconds

I'll give a brief definition which is that this this sub aents thing here,

18:10

18 minutes, 10 seconds

this explore sub agents, it has essentially gone and called another LLM which has an isolated context window

18:18

18 minutes, 18 seconds

and then that LLM has reported a summary back. So a sub aent is kind of like a delegation. You're delegating a task to a sub agent. It goes eagerly does all

18:26

18 minutes, 26 seconds

the thing, explores a ton of stuff and then just drip feeds the important stuff back up to the orchestrator agent to the parent agent. So, okay. So, hopefully

18:36

18 minutes, 36 seconds

you guys have seen the same thing. It's done on explore. And we now have our first question. Points economy. What actions earn points and how much? Okay.

18:45

18 minutes, 45 seconds

At this point, you can ask it, by the way, questions to um deepen your understanding of the repo. I obviously know this repo really well because I wrote it, but you might not um know

18:54

18 minutes, 54 seconds

what's going on. So, let's say my recommendation, keep it simple, twopoint sources to start. What's so nice about

19:01

19 minutes, 1 second

this is that not only does it give us a question that kind of aligns us here, we get a recommendation, too. And often what I'll find is the AI's

19:09

19 minutes, 9 seconds

recommendations are really good. And so I'll just say skip video, watch events, they're noisy and gameable. I agree.

19:16

19 minutes, 16 seconds

Sarah's asked while keep lessons in the bread and butter. Yeah, looks good, pal.

19:24

19 minutes, 24 seconds

Now, what I usually do is I usually dictate to the AI. I'm usually actually chatting to the AI instead of uh typing here, but uh this is a relatively new

19:33

19 minutes, 33 seconds

laptop and I couldn't get my dictation software working on it um because Windows is crap. Um

19:41

19 minutes, 41 seconds

so should points be retroactive? There are existing lessons progress records.

19:45

19 minutes, 45 seconds

We're completing out timestamps. This is a really nasty question, right? Should we actually go back and backfill all of the lesson progress events? This is a

19:53

19 minutes, 53 seconds

kind of question that you need to be aligned on if you're going to fulfill the feature properly. This is not something I considered and Sarah Chen certainly didn't consider. Do I want it

20:02

20 minutes, 2 seconds

to be retroactive? H. Let's actually do a vote inside here. Should we go back and backfill all the records? Raise your hand if you think we should backfill all the records.

20:13

20 minutes, 13 seconds

Raise your hand if you think we shouldn't backfill all the records.

20:17

20 minutes, 17 seconds

There are a lot of uh fence sitters in the room. I'm going to say,

20:22

20 minutes, 22 seconds

you know, this is the kind of discussion you're sort of having with the AI.

20:24

20 minutes, 24 seconds

You're getting further aligned. Yes, I'm just going to go with this recommendation because I'm lazy.

20:31

20 minutes, 31 seconds

Notice, too, how I'm able to keep in the loop here with AI. I'm not, you know,

20:35

20 minutes, 35 seconds

it's it's pinging me these questions pretty quickly.

20:39

20 minutes, 39 seconds

I'm not having to go off and check Twitter or something. Levels. What's the progression curve? Yeah, that looks about right, for instance. Yes. Okay. So

20:48

20 minutes, 48 seconds

hopefully you should be able to go and um kind of work through this with the AI and essentially try to reach an

20:55

20 minutes, 55 seconds

alignment. And this grill me skill this can last a long time. This can I've had it ask me 40 questions. I've had it ask me 80 questions. I've had some people it

21:04

21 minutes, 4 seconds

asks a hundred questions to literally you're sat there for an hour chatting to the AI. And what you end up with is

21:11

21 minutes, 11 seconds

essentially this conversation history that works really nicely and works really nicely as an asset of the design concept that you're creating. This can

21:20

21 minutes, 20 seconds

also function like this. You can uh have a meeting with someone who's a maybe a domain expert. Maybe I have a meeting with Sarah. I feed that meeting

21:28

21 minutes, 28 seconds

transcript into uh I don't know Gemini meetings or whatever you guys are using.

21:33

21 minutes, 33 seconds

You take that, you feed it into a grilling session and you grill through the assumptions that you didn't have.

21:39

21 minutes, 39 seconds

So, this ends up being a really nice kind of um a really nice way of just taking inputs from the world and then just turning and validating them. So,

21:49

21 minutes, 49 seconds

okay,

21:51

21 minutes, 51 seconds

let's see. I really want to get to the end of this, but I also don't want to just like be sat here talking to the AI in front of you for uh a thousand days.

21:58

21 minutes, 58 seconds

So, I'm just going to say yes.

22:03

22 minutes, 3 seconds

Let's see what happens. So, I tell you what. Um, while you guys sort of have a little fiddle with this locally, let's start a little Q&A session now. And

22:13

22 minutes, 13 seconds

let's see how's this going to work. Can we keep the door closed? I'll turn up the microphone. It's quite noisy. Uh,

22:20

22 minutes, 20 seconds

let's see. Mike, can we uh Door closed?

22:23

22 minutes, 23 seconds

Oh, it has been closed. Mark has answered. Beautiful. So, what I'd like you to do is there any air con? Yeah,

22:30

22 minutes, 30 seconds

there is some air con. I think there is some air con you guys aren't being lit here. I'm being I'm being fried alive

22:37

22 minutes, 37 seconds

here. Uh so what I'd like you to do is go on to the slideo which you can join here. Have a if if you're not taking the exercise, go on to the slideo, have a

22:46

22 minutes, 46 seconds

little fiddle and vote on some good questions. I'm just going to chat to the AI for a second uh until we reach a stopping point. So do streaks earn points?

22:56

22 minutes, 56 seconds

Um, streaks are standalone.

23:06

23 minutes, 6 seconds

Let's see what else it comes up with.

23:12

23 minutes, 12 seconds

Where does gamification UI live? Let's have it in the dashboard.

23:19

23 minutes, 19 seconds

I'm just going to scan these and blast through them basically. So, how we doing with our slido? Okay.

23:26

23 minutes, 26 seconds

Have I tried specit open spec or taskmaster instead of the grill me skill? Do I find them more verbose or a structured alternative? This is a great question. So there are a ton of

23:35

23 minutes, 35 seconds

different frameworks out there that allow you to um sort of build up this planning process for you. I personally

23:42

23 minutes, 42 seconds

believe you at at this stage when there's no clear winner, when there's no kind of like one true way and when things are changing all the time, you

23:50

23 minutes, 50 seconds

need to own as much of your planning stack as you possibly can. What I've noticed and a lot of my students is they tend to overuse a certain stack.

24:03

24 minutes, 3 seconds

they get into trouble and they because they don't own the stack and they don't have observability over the whole thing,

24:09

24 minutes, 9 seconds

they just go, "This isn't working. This sucks." Whereas if um if you have control over the whole thing, then at

24:17

24 minutes, 17 seconds

least you know how to fix it or potentially know how to fix it. So I'm even though I'm sort of giving you uh a

24:26

24 minutes, 26 seconds

stack basically, I believe in inversion of control and you should be in control of the stack.

24:32

24 minutes, 32 seconds

So, can I press zero, please? Sorry.

24:40

24 minutes, 40 seconds

Sorry, that was a lot of sort of mumbling. Can I feedback? You have four options on the bottom of you to hit dismiss.

24:48

24 minutes, 48 seconds

Thank you.

24:50

24 minutes, 50 seconds

I'm so sorry. Well, you didn't want to give Claude good feedback. Why? What's wrong with you?

24:58

24 minutes, 58 seconds

Okay, cool.

24:59

24 minutes, 59 seconds

Uh many of the questions asked by the grill me skill are not necessarily appropriate for a developer rather a PO in larger teams who should use it. Yeah.

25:06

25 minutes, 6 seconds

Um raise your hand if um you've ever done pair programming. Anyone ever done pair programming? Right. Keep put your

25:15

25 minutes, 15 seconds

hands down and raise your hand again if you've ever done a pair programming session with an AI.

25:20

25 minutes, 20 seconds

Right. How did it go? Was it good? You enjoy it? I think pair programming sessions with AI is a great idea because you've got a third person in the room

25:28

25 minutes, 28 seconds

who will relentlessly quiz you and ask you questions. It should if you don't know the answer, it should be you, the domain expert and the AI in the same

25:35

25 minutes, 35 seconds

room. If you have a question about implementation, it should be you, a fellow developer and the AI in the same room. You know, you can be sort of

25:43

25 minutes, 43 seconds

working through these questions in your team. And I think actually we're going to look at implementation in a bit and we're going to see how you can make

25:50

25 minutes, 50 seconds

implementation so much faster. And but I think the really crucial decisions, the ones you need humans for, you actually

25:57

25 minutes, 57 seconds

need a lot of humans and it doesn't really matter how many humans are in there. You can actually throw a bunch like a kind of like mob programming with AI essentially.

26:07

26 minutes, 7 seconds

Uh what's my favorite metaprompting tool? I think I kind of answered that.

26:10

26 minutes, 10 seconds

Uh there's no air con. Let's just live with it. Uh, how do I use the conversation as an asset after the grill me session? Well, we're going to get there.

26:20

26 minutes, 20 seconds

Um, okay. So, I really want to I want to speed this up sort of artificially.

26:28

26 minutes, 28 seconds

Just what I This is the thing. So, someone just said, "Okay, Ralph loop this." But this is crucial because I can't loop over

26:36

26 minutes, 36 seconds

this, right? I can't um I think of there as being two types of tasks in the AI age where you have human in the loop

26:45

26 minutes, 45 seconds

tasks where a human needs to sit there and do it which is this we are the human in the loop with multiple humans in the

26:52

26 minutes, 52 seconds

loop and there are AFK tasks there are tasks where the human can be away from the keyboard and it doesn't matter implementation as we'll see can be

27:00

27 minutes

turned into an AFK task but planning this alignment phase has to be human in the loop has to be.

27:09

27 minutes, 9 seconds

So, I've got to do it, unfortunately.

27:11

27 minutes, 11 seconds

Um, I don't know. Uh, give me a long list of all your recommendations.

27:20

27 minutes, 20 seconds

I'm running a workshop right now,

27:24

27 minutes, 24 seconds

so I artificially need you to pull more weight.

27:31

27 minutes, 31 seconds

So, let's see what it does. Uh, let's answer a couple more questions while it's doing its thing.

27:37

27 minutes, 37 seconds

What is my opinion on PMS or other non-dev rolls vibe coding task?

27:45

27 minutes, 45 seconds

Um, I'm going to return to this later. I think I'm going to leave this unanswered. A bit of mystery.

27:53

27 minutes, 53 seconds

I notice I'm not using the ask user questions UI for grill me. Why? Um,

27:57

27 minutes, 57 seconds

there's a specific uh UI that you can bring up in claude code which I'll answer this just quickly. uh ask me a

28:05

28 minutes, 5 seconds

question using the ask user question tool.

28:10

28 minutes, 10 seconds

And this UI um is just sort of broken in Claude and I really hate it.

28:16

28 minutes, 16 seconds

You notice I'm using Claude, but I don't like Claude very much. Like you you really are free with this method to choose any um system you like. And this

28:24

28 minutes, 24 seconds

is what the UI looks like. It's very pleasing when you first encounter it,

28:27

28 minutes, 27 seconds

but then you realize it is actually broken in a ton of different ways. All right, what did it come back with? Oh, blime me.

28:35

28 minutes, 35 seconds

Oh, no. So,

28:40

28 minutes, 40 seconds

while this is doing its thing, let me do some teaching in the meantime. The plan here is that we take our grill me skill

28:47

28 minutes, 47 seconds

and we need to essentially find some way of turning it into a destination.

28:53

28 minutes, 53 seconds

We need to go down to the uh we essentially need to we're figuring out the shape of this. That's what we're

29:01

29 minutes, 1 second

doing. figuring out the shape of the tasks during the grilling session. And in order to turn it into a bunch of

29:09

29 minutes, 9 seconds

actionable actions for the AI, we essentially need to figure out the destination. We need to know where we're going. We need to know the shape of this

29:17

29 minutes, 17 seconds

entire thing. So I think of there as being two essential documents that we need. We need a document that documents the destination.

29:27

29 minutes, 27 seconds

Oh no, it's so not bright enough. There we go.

29:33

29 minutes, 33 seconds

Still not bright enough. There we go. We need something to document the destination and we need something to document the journey. In other words, we

29:41

29 minutes, 41 seconds

need something a document that's going to figure out what this even looks like in all of its user stories and figure out a definition of done. And then we

29:50

29 minutes, 50 seconds

need to figure out what the split looks like. So that's where we're going to go to next. So once we finish with the grilling session.

29:59

29 minutes, 59 seconds

Yeah, it looks great. Fantastic. I love it. It answered it answered 22 of its own questions. There you go. That's quite representative of what a grilling session looks like.

30:09

30 minutes, 9 seconds

So at this point now I have used 25k tokens and all of that or loads of that

30:17

30 minutes, 17 seconds

stuff is gold. I want to keep that around. I've I've got 25k great tokens there. And what I want to do is kind of

30:25

30 minutes, 25 seconds

summarize it in some kind of destination document. So this is um the next exercise where we're going to

30:35

30 minutes, 35 seconds

uh we're going to write a product requirements document. And the product requirements document or the PRD is

30:43

30 minutes, 43 seconds

essentially that's its function. It's the destination document. And it sort of doesn't matter what shape it is. I've

30:51

30 minutes, 51 seconds

got a shape that I prefer and that I quite like, but you can just choose your own shape or whatever your company uses.

31:00

31 minutes

And all we're really doing is too worried about that.

31:05

31 minutes, 5 seconds

All we're really doing is summarizing the design concept that we have so far.

31:10

31 minutes, 10 seconds

And the So let let's try this. So I'm going to initiate this. I'm going to say zoom

31:17

31 minutes, 17 seconds

all the way to the bottom. All I'm going to do is just say write a PRD.

31:23

31 minutes, 23 seconds

And we can take a look at that skill now. Write a PRD. So this skill,

31:31

31 minutes, 31 seconds

it does a few things. It first asks the user for a long detailed description of the problem. You can use write a PRD without grilling first, but I just like

31:39

31 minutes, 39 seconds

to grill first and then write the PRD afterwards. Then you can um get it to explore the repo, which we've kind of

31:46

31 minutes, 46 seconds

already done. Then we get it to interview the user relentlessly. So have a kind of grilling session again. And

31:52

31 minutes, 52 seconds

then we start um putting together a PRD template. So this is available in the repo if you want to check it out. And essentially this is what it looks like.

32:01

32 minutes, 1 second

We've got some problem statements, the problem the user is facing, the solution to the problem, and a set of user stories. And these user stories sort of

32:08

32 minutes, 8 seconds

define what this is. You know, as you you guys have probably seen things like this if you've been a developer at all.

32:14

32 minutes, 14 seconds

um you know there are cucumber is a language you can use to write these in or we just sort of um uh write them ourselves essentially. Then we have a

32:22

32 minutes, 22 seconds

list of implementation decisions that were made and a list of crucially testing decisions too. So

32:31

32 minutes, 31 seconds

I'm going to run this. Okay. And so it's finished its thing. Ah Windows let me close the thing. Thank

32:39

32 minutes, 39 seconds

you. I don't know why I bought a Windows laptop. I think I just I like the challenge. Um

32:46

32 minutes, 46 seconds

so the first thing that it's going to give me are a set of proposed modules it wants to modify.

32:54

32 minutes, 54 seconds

Now there's a deep reason why I'm thinking about this. So this is at this stage we have an idea. We have sort of

33:02

33 minutes, 2 seconds

speced out the idea. We've reached a sort of understanding of what we're trying to do. And then we need to start

33:09

33 minutes, 9 seconds

thinking about the code because at this point we need to this is not specs to code. This is not where we're ignoring

33:16

33 minutes, 16 seconds

the code. We actually keep the code in mind throughout the whole process. And the way I like to do this is I like to just sort of think about a set of

33:24

33 minutes, 24 seconds

proposed modules to modify. We're going to return to this this idea of continually designing your system and keeping your system in mind. So it's

33:33

33 minutes, 33 seconds

it's saying recommend test for the gamification service is the only deep module with meaningful logic. These modules look right. Yeah, that's good.

33:44

33 minutes, 44 seconds

And it's going to ping out a PRD.

33:48

33 minutes, 48 seconds

Now for ease of setup, I've got it so that it creates a set of issues locally.

33:54

33 minutes, 54 seconds

So it's just going to create essentially a PD inside this issues directory. But the way I usually do it, and you can

34:02

34 minutes, 2 seconds

check this out yourself, is you can go to my um essentially what I consider my work repo, which is github.com/mattpocco/course

34:12

34 minutes, 12 seconds

video manager up here. And in here, this is essentially a app that I create um that I use all the time to record my

34:21

34 minutes, 21 seconds

videos and things like this. I think I've recorded like I pulled down the sets. I think I've recorded like a thousand videos in here or something nuts. Um, and you can see here that it's

34:30

34 minutes, 30 seconds

got 744 closed issues. And this is essentially all of the uh PRDs and all of the implementation issues that I've

34:38

34 minutes, 38 seconds

put into here. So, this is how I usually like to do it.

34:42

34 minutes, 42 seconds

So, that's what I'm doing with the There we go. Yeah, I'm just going to say yes and uh and get that issue out. Let's see. It is

34:52

34 minutes, 52 seconds

inside here. So, we got the problem statement. people sign up for courses,

34:58

34 minutes, 58 seconds

uh the solution, the user stories, uh 18 user stories, looks nice, some implementation decisions, level thresholds, etc. This is enough

35:05

35 minutes, 5 seconds

information. We've kind of clarified where we're going and what we're doing.

35:09

35 minutes, 9 seconds

So that's what we do. We essentially have a grilling session and we've created an asset out of it. Now, raise your hand. Should I be reviewing this

35:17

35 minutes, 17 seconds

document? Raise your hand if you think I should be reviewing the document.

35:22

35 minutes, 22 seconds

Yeah, I don't I don't look at these. I don't look at these. The reason I don't look at these is because what am I testing at this point? What am I like when I read it?

35:33

35 minutes, 33 seconds

What am I testing? What am I what are the failure modes I'm trying to test for? I know that LLMs are great at summarization because they are they're really good at summarization. I have reached the same wavelength as the LLM,

35:45

35 minutes, 45 seconds

right? Using the grill meme skill, we have a shared design concept. So if I have a shared design concept, all I'm doing is I'm just essentially checking the LLM's ability to summarize.

35:56

35 minutes, 56 seconds

So I don't tend to read these.

36:00

36 minutes

Let's have let's have a Q&A because I can feel you guys are itching for it.

36:03

36 minutes, 3 seconds

And then I think we might have like I don't know just a five minute comfort break just to rest my voice and so you can catch up with the exercises for a minute if that's all right. So let's

36:11

36 minutes, 11 seconds

have a little Q&A sesh. Uh, if I don't like clawed code, which one do I actually like? Um,

36:20

36 minutes, 20 seconds

uh, have you ever heard the phrase, um,

36:23

36 minutes, 23 seconds

uh, democracy is the worst way to run a country apart from all the other ways? That's how I feel about claw code.

36:30

36 minutes, 30 seconds

Uh, we've answered that one. Uh,

36:34

36 minutes, 34 seconds

what's your thoughts on developers needing to very deeply understand Typescript now that fix the TS make no mistakes exist? I don't understand the

36:42

36 minutes, 42 seconds

phrasing of this but I think I understand the meaning which is that I believe that code is very important

36:50

36 minutes, 50 seconds

and this is kind of going to feed through the whole session and that bad code bases make bad agents. If you have a garbage codebase you're going to get

36:59

36 minutes, 59 seconds

garbage out of the agent that's working in that codebase. We'll talk more about that in a bit. And so I think understanding these tools very deeply,

37:06

37 minutes, 6 seconds

understanding code deeply is going to make you a much much better developer and get more out of AI.

37:14

37 minutes, 14 seconds

Uh, and that answers that question too. Sweet. Uh, get out of it. There you are.

37:24

37 minutes, 24 seconds

Now that we have 1 million tokens available, do we ever actually want to take advantage of that?

37:30

37 minutes, 30 seconds

I've noticed that the dumb zone has become less dumb lately. Okay, great question. This goes back to our kind of initial idea on the dumb zone.

37:41

37 minutes, 41 seconds

Uh I um I recorded my Claude Code course using a 200k context window and on the

37:49

37 minutes, 49 seconds

day that I launched the course, they announced the 1 million context window.

37:53

37 minutes, 53 seconds

My take on this is that what Claude code did is they essentially just did this.

37:58

37 minutes, 58 seconds

They shipped a lot more dumb zone to you essentially. Now, this is good for tasks where you want to retrieve things from a

38:06

38 minutes, 6 seconds

large context window. If you want to pass five copies of War and Peace or something to it, and you want to find out all the things that uh

38:14

38 minutes, 14 seconds

uh I can't remember a character from War and Peace. Uh why did I start with that?

38:18

38 minutes, 18 seconds

It's good for retrieval. It's less good for coding. So, I consider that it is about 100K at the moment is the smart

38:28

38 minutes, 28 seconds

zone. the smart zone will get bigger and that will be a really nice improvement.

38:33

38 minutes, 33 seconds

So folks, we're going to take like a five minute comfort break if that's all right just for my voice and so maybe you can have a little move around or something or grab a drink. I can just

38:41

38 minutes, 41 seconds

notice some sleepy eyes and I want to make sure that we're awake for the next bit if that's all right. So we'll take five minutes and I'll see you back here then. All right.

38:51

38 minutes, 51 seconds

So we have our PR which I'm not going to read a kind of destination document.

38:58

38 minutes, 58 seconds

Let's quickly scan for any good questions before we zoom ahead.

39:02

39 minutes, 2 seconds

And rediscovering the role of software engineer in today's world. Top three disciplines you recommend. Um, taekwondo

39:12

39 minutes, 12 seconds

is good. I've heard I' have no idea how to answer this question. Um, thank you for asking it though. Um, top three disciplines I recommend.

39:21

39 minutes, 21 seconds

I mean, sorry, plumbing. Plumbing is a good one. Yeah. Yeah.

39:24

39 minutes, 24 seconds

Yeah. I don't know if that's a discipline. The plumbers I've hired are not usually very disciplined. Um, right.

39:32

39 minutes, 32 seconds

So, okay, we now have our destination. Okay. Um, perfect.

39:39

39 minutes, 39 seconds

So, how do we actually get to our destination? How do we We have a sort of vague PRD. How do we split it so that we

39:46

39 minutes, 46 seconds

don't put things into the dump zone? In other words, we have our number four.

39:50

39 minutes, 50 seconds

How do we split it into this kind of multi-phase plan? Well, probably what you would do at this point is you would say, "Okay, Claude, give me a multi-phase plan that gets me to this

39:59

39 minutes, 59 seconds

destination." Right? That sort of makes sense. This is what we've been doing before, but I have um a sort of better way of doing it now, which is that

40:08

40 minutes, 8 seconds

I like creating a canban board out of this. Raise your hand if you don't know what a canban board is.

40:17

40 minutes, 17 seconds

Cool. Okay. A camon board is essentially just a set of tickets that you put on the wall that have blocking relationships to each other. So, we're

40:25

40 minutes, 25 seconds

going to see what it kind of looks like here. This is how we've worked um as developers for a long time, really since

40:31

40 minutes, 31 seconds

agile came around. And what it does, we can see it here. It has proposed that we

40:38

40 minutes, 38 seconds

split this setup into um five different tasks. Here we have the first one which is the schema and the gamification service. Yeah, that looks pretty good.

40:48

40 minutes, 48 seconds

This is blocked by nothing. And we can even see here that it's a it's given it a type of AFK, too. Remember I talked about human in the loop and AFK earlier.

40:57

40 minutes, 57 seconds

This is an AFK task. This is something we can just pass off to an agent to do its thing. Streak tracking. Okay, that looks good.

41:04

41 minutes, 4 seconds

Uh then wire points and streaks into lessons quiz completion. This is blocked by one and two. Retroactive backfill.

41:11

41 minutes, 11 seconds

This is blocked only by one. And then this one here is blocked by all of the tasks. Cool.

41:19

41 minutes, 19 seconds

H. Now I consider this, you could say,

41:23

41 minutes, 23 seconds

why don't we just make this sort of generation of the issues? Why don't we just hand that over to the AI? Why do I need to be involved here? Right? Because it's given us quite a good selection of

41:32

41 minutes, 32 seconds

tools here. Why do I need to review this and sort of figure out what's next? Now,

41:37

41 minutes, 37 seconds

my take here is that this is really cheap to do, like very quick to do once I've done the PR. And I can immediately see some issues here.

41:47

41 minutes, 47 seconds

There's a really, really important technique when you're kind of figuring out what the shape of this journey

41:53

41 minutes, 53 seconds

should look like. And it sort of comes to this very classic idea uh which comes from pragmatic

42:02

42 minutes, 2 seconds

programmer called tracer bullets or vertical slices.

42:07

42 minutes, 7 seconds

and traceable. It's really transformed the way I think about actually getting AI to pick its own tasks.

42:14

42 minutes, 14 seconds

Systems have layers, right? There are layers in your system. These might be different deployable units. You might have a database that lives somewhere.

42:23

42 minutes, 23 seconds

You might have an API that lives maybe close to the database but in a separate bit. You might have a front end that lives somewhere totally different like a CDN. Or within these deployable units,

42:32

42 minutes, 32 seconds

you might have different layers within those. In for instance the codebase that we're working in, we have a ton of different services servers. We have a

42:41

42 minutes, 41 seconds

quiz service, a team service, user service, coupon service, course service.

42:45

42 minutes, 45 seconds

And these services have dependencies on each other. So they're kind of like individual layers. Well, what I noticed is that AI loves to code horizontally.

42:57

42 minutes, 57 seconds

So it loves to code layer by layer. So in other words, in phase one, it will do all of the database stuff, all of the schema, all of the, you know, all the

43:06

43 minutes, 6 seconds

stuff related to that unit. Then it will go into phase two and do all of the API stuff. Then it will add the front end on top of that.

43:14

43 minutes, 14 seconds

Does can anyone tell me what's wrong with that picture? Why is that not a good thing to do? Raise your hand if you have an answer. Yeah.

43:21

43 minutes, 21 seconds

Have the whole feedback loop.

43:23

43 minutes, 23 seconds

Exactly. You don't get feedback on your work until you've really started or completed phase three.

43:32

43 minutes, 32 seconds

So what you really need to do is you're not until you get to phase three, you're not actually testing that all the layers work together.

43:41

43 minutes, 41 seconds

You haven't got an integrated system that you can test against. And so instead you need to think about vertical layers. You need to think about thin

43:49

43 minutes, 49 seconds

slices of functionality that cross all of the layers that you need to. And this is a much better way to work, much

43:57

43 minutes, 57 seconds

better way for the AI to work too because it means at the end of phase one or during phase one, it can get feedback on its entire flow. So what this means

44:05

44 minutes, 5 seconds

to me is inside the PRD to issues skill up here I have got break a PRD into

44:15

44 minutes, 15 seconds

independently grabbable issues using vertical slices traceable it's written as local markdown files we first locate the PRD

44:23

44 minutes, 23 seconds

uh again explore the codebase if this is a fresh session we draft vertical slices so we break the PRD into tracer bullet

44:30

44 minutes, 30 seconds

issues a traceable bullet by the way is Uh, essentially when you're like an anti-aircraft gunner, it's quite a

44:37

44 minutes, 37 seconds

violent idea actually, uh, and you're looking up in the sky and it's night, if you're just shooting normal bullets, you have no idea what you're firing at,

44:45

44 minutes, 45 seconds

right? You could just be, you know, you see the plane, but you don't see where your bullets are going. Tracer bullets is they attach a tiny bit of phosphoresence or phosphor or something

44:53

44 minutes, 53 seconds

to make it glow as it goes. So, this means that every sixth bullet or something, you actually see a line in the sky. So, you have feedback on where

45:01

45 minutes, 1 second

you're aiming. So this is what this is the idea here is that we increase our level of feedback and we get near instant feedback on what we're building

45:09

45 minutes, 9 seconds

because without that the AI is kind of coding blind until it reaches the later phases. We've got some vertical slice rules. We quiz the user and then we

45:17

45 minutes, 17 seconds

create the issue files. So what I see here is that even though I've I've told

45:24

45 minutes, 24 seconds

it to do vertical slices, it's proposing to create the gamification service

45:32

45 minutes, 32 seconds

first on its own. That's just one slice there. And that to me feels like a horizontal slice. What I want to see in the first vertical slice especially is I

45:41

45 minutes, 41 seconds

want to see the schema changes or some schema changes. I want to see some new service being created and I want a minimal representation of that on the

45:48

45 minutes, 48 seconds

front end. So I want it to go through the vertical slices, not just the horizontal. Does that make sense? Okay.

45:55

45 minutes, 55 seconds

So I'm going to give the AI a rollicking. Uh bad boy. No,

46:02

46 minutes, 2 seconds

I'm not going to waste tokens just being just memeing. Um so the first slice is too horizontal. I'll just start with

46:10

46 minutes, 10 seconds

that and see if it picks it up. Does that make sense as a concept? And I think having that um what I really like

46:17

46 minutes, 17 seconds

about going back to those old books is that we are really trying to in this day and age like get

46:25

46 minutes, 25 seconds

uh verbalize best software practices in English. And these books, 20-year-old books have already done that. And it's

46:32

46 minutes, 32 seconds

an absolute gold mine if you want to throw that into prompts. But even with that, it's not going to um not going to do a perfect job each time. So, award

46:41

46 minutes, 41 seconds

points for lesson completion visible on dashboard. Yes, that's a beautiful vertical slice because it's definitely a big chunk of stuff. It's doing a lot of

46:49

46 minutes, 49 seconds

stories there, but we're going to see something visible at the end and the AI will then just be able to add to that.

46:55

46 minutes, 55 seconds

You see why that's preferable to the first one. Cool. Uh, looks great.

47:01

47 minutes, 1 second

So, we're getting closer now. And anyone following at home as well, you're not at home, but you get the idea. um we'll hopefully see the same thing too and start developing the same instincts.

47:11

47 minutes, 11 seconds

Let's open up for questions just while I'm sort of creating these GitHub issues or not GitHub issues uh local issues.

47:20

47 minutes, 20 seconds

When will I stop using Windows? Never.

47:22

47 minutes, 22 seconds

What is your uh Okay, we'll get to that later.

47:26

47 minutes, 26 seconds

How does AI um decide when to stop grilling? Because AI can ask incessantly. Can we have a smarter way to decide the stop point? Yeah, it does

47:33

47 minutes, 33 seconds

tend to really um those grilling sessions can be super intense. And the thing about these skills is you can tune them if you want to. If you feel like the AI is just absolutely hammering you,

47:42

47 minutes, 42 seconds

hammering you, hammering you, then you can just tell it to just pull back a little bit or get it to do, you know, stop points and that kind of thing. So,

47:49

47 minutes, 49 seconds

if that's a failure mode that you run into a lot, then you just, you know, change the skill.

47:55

47 minutes, 55 seconds

Uh do I still use uh be extremely concise, sacrifice grammar for the sake of concision? Um there was a tip that I gave folks um five months ago which is

48:05

48 minutes, 5 seconds

that to basically increase the readability of your plans. So when you're using plan mode then you can put it in your claw.md and you can say okay yeah approve that.

48:17

48 minutes, 17 seconds

Let's open up claw.md.

48:21

48 minutes, 21 seconds

Do I have a claw.md? Maybe I don't. I I really don't use clawd very much. I'm just going to put a dummy inside here.

48:28

48 minutes, 28 seconds

Um when no when talking to me uh sacrifice grammar for the sake of

48:35

48 minutes, 35 seconds

concision and this um prompt was uh really useful

48:43

48 minutes, 43 seconds

to me when I was reading the plans because it meant that the plans would come out and they would be very concise,

48:48

48 minutes, 48 seconds

really nice, easy to read, often very uh concise. But I've since dropped this idea in preference to a grilling session

48:57

48 minutes, 57 seconds

because what I noticed was it just I didn't want to read the plans. I wanted to get on the same wavelength as the LLM. I wanted it to ask aggressive questions to me. And when I stopped

49:05

49 minutes, 5 seconds

reading the plans, I stopped needing them to be concise. So I think of the plans really in the destination document as uh the end state. And I don't need

49:13

49 minutes, 13 seconds

that end state to be concise. Hopefully that answers your question.

49:19

49 minutes, 19 seconds

Uh, what do I think will be the outcome of the Mexican standoff of future roles of PMS and other roles converging? Uh, I have no idea. I'm not a pundit. I have no idea.

49:30

49 minutes, 30 seconds

Uh, okay. So, we should uh after a couple of approvals uh end up with a set of issues. Now,

49:40

49 minutes, 40 seconds

these issues that we're creating,

49:43

49 minutes, 43 seconds

they're designed to be independently grabbable, which means that this canon board ends up looking kind of like this

49:51

49 minutes, 51 seconds

where you have essentially a set of tickets with a whole load of independent relationships.

49:57

49 minutes, 57 seconds

So, this one needs to be done before this one. This one needs to be done before this one. And this one, let's say we got another one over here. This one

50:05

50 minutes, 5 seconds

needs to be done before this one. This means that you can start to parallelize.

50:11

50 minutes, 11 seconds

You can start to get agents working at the same time on these tasks because yeah, this one needs to be done first

50:18

50 minutes, 18 seconds

and then these two can be grabbed at the same time by independent agents. Raise your hand if

50:26

50 minutes, 26 seconds

you've done any kind of parallelization work with agents. Okay, cool. So this allows you um to turn those plans into

50:35

50 minutes, 35 seconds

optimally kind of like into directed asyclic graphs essentially where you just are able to um essentially have

50:43

50 minutes, 43 seconds

three phases here where you have phase one.

50:49

50 minutes, 49 seconds

Let me grab move that uh above this line here you do this one.

50:56

50 minutes, 56 seconds

Then phase two you do the two below it.

50:58

50 minutes, 58 seconds

And then phase three you do this third one. and add it onto there. And when you think about there could be this could this is a relatively simple plan but you

51:07

51 minutes, 7 seconds

could have many different plans operating all at once. It means that you can do really nice parallelization and we'll talk more about that in a bit. But

51:14

51 minutes, 14 seconds

that's why I prefer a canon board set up like this to a sequential plan because a sequential plan can really only be

51:22

51 minutes, 22 seconds

picked up by one agent. So this where did it go? Over here.

51:29

51 minutes, 29 seconds

Yeah, this plan here, this is really only one loop, right? Only one agent can work on these because we have numbered phases and they're not parallelizable.

51:38

51 minutes, 38 seconds

Does that make sense? Cool. So, we've got our issues. Ah, come on.

51:44

51 minutes, 44 seconds

Stop asking me for Oh, no. It's creating them on GitHub. I really don't want that. Oh, no. You fool.

51:53

51 minutes, 53 seconds

Create them in issues instead.

51:58

51 minutes, 58 seconds

No, that's not precise enough. Uh, you fool. Create them in local markdown

52:04

52 minutes, 4 seconds

files instead referencing the local version. Sorry about this.

52:15

52 minutes, 15 seconds

So, once we get to this point, we have a bunch of issues locally that we can start um looping over and implementing.

52:25

52 minutes, 25 seconds

And it's at this point that the human leaves the loop. So, so far,

52:31

52 minutes, 31 seconds

let me pull up a a proper overview of this kind of flow that we're exploring here. So far,

52:40

52 minutes, 40 seconds

we have taken an idea,

52:43

52 minutes, 43 seconds

zoom this in a bit for the folks at the back,

52:47

52 minutes, 47 seconds

and we've grilled ourselves about the idea. We can skip over research and prototype,

52:52

52 minutes, 52 seconds

but we've turned that into a PRD into a destination document. We've then turned that PRD into a canon board and all of

53:00

53 minutes

those steps are human reviewed. And now the implementation stage, we step back

53:08

53 minutes, 8 seconds

and we let an agent um work through that camp board or multiple agents work through the camp board.

53:15

53 minutes, 15 seconds

Now, what this means is that yeah, we've spent a lot of time planning here, but it means that we've queued up a lot of work for the agent. We can think of this

53:23

53 minutes, 23 seconds

as kind of like the day shift and the night shift. This is the day shift for the human, right? Planning everything,

53:28

53 minutes, 28 seconds

getting all the uh all the stuff ready and then once we kick it over to the night shift, the AI can just work AFK. But what does that look like?

53:37

53 minutes, 37 seconds

Well, so I'm just going to Oh, yeah. Just allow it. It's perfect.

53:42

53 minutes, 42 seconds

So this looks like if we head to the next exercise which is

53:51

53 minutes, 51 seconds

uh in fact the last exercise here running your AFK agent.

53:55

53 minutes, 55 seconds

Now I've called this uh Ralph really because it is a it is essentially a Ralph loop and this prompt here I want to walk through this really closely.

54:06

54 minutes, 6 seconds

The first thing it's doing here is we're essentially going to run Claude and we're going to basically try to encourage it to work um completely AFK.

54:16

54 minutes, 16 seconds

I'll show you what the sort of script for this looks like in a minute, but you say, okay, local issue files from issues are provided at the start of context.

54:24

54 minutes, 24 seconds

The way we do that is if you look inside once.sh SH here inside the repo we have

54:31

54 minutes, 31 seconds

uh it's essentially just a bash script where we grab all of the issues um which are inside markdown files and we cap

54:40

54 minutes, 40 seconds

them into a local variable. So that issues variable contains all of the issues that are in our entire backlog.

54:47

54 minutes, 47 seconds

Then we grab the last five commits. I'll explain why in a minute. And then we grab the prompt and we just run claude

54:54

54 minutes, 54 seconds

code with permission mode except edits and then just essentially just pass it all of the information. This is what the

55:02

55 minutes, 2 seconds

implement looks like. So that's what a very very simple version of this sort of loop looks like. And of course this is not a loop. This is just running it once.

55:12

55 minutes, 12 seconds

The loop is in the AFK version up here which is uh a fair bit more complicated.

55:18

55 minutes, 18 seconds

And the crucial part here is we're running it in Docker sandbox as well. So I I don't want you to install Docker on your laptops because we're just going to

55:27

55 minutes, 27 seconds

be like you need to download a special image and we're going to tank the conference Wi-Fi if we do that. So I I am going to demo this to you, but you um

55:34

55 minutes, 34 seconds

won't need to run this yourself. But I'll talk through this in a minute. But essentially this once loop here,

55:44

55 minutes, 44 seconds

we're just essentially running one version of the thing that we're going to loop again and again and again. So this is kind of like the human in the loop

55:51

55 minutes, 51 seconds

version. And this is essential. Running this again and again is essential because you're going to see what the agent does and see how it ends up

55:59

55 minutes, 59 seconds

working. And any tuning that you need to add to the prompt, then you can do that. Let's go to the prompt.

56:06

56 minutes, 6 seconds

Um,

56:09

56 minutes, 9 seconds

so local issue files are being passed in. You're going to work on the AFK issues only. That makes sense. If all AFK tasks are complete, output this no

56:18

56 minutes, 18 seconds

more tasks thing. And then the next thing, pick the next task. So

56:26

56 minutes, 26 seconds

what we're doing here is we're essentially running a backlog or curating a backlog that our AFK agent is going to pick up. That's the purpose of

56:34

56 minutes, 34 seconds

all of these um setups in the beginning in this uh all the way to this canon board here. We're just essentially

56:42

56 minutes, 42 seconds

creating a backlog of tasks for the night shift to pick up and the night shift this sort of Ralph prompt here.

56:50

56 minutes, 50 seconds

It's got its own idea about what a good task looks like. So next pick up I'm I did talk about parallelization. I will

56:58

56 minutes, 58 seconds

show you this later, but this is essentially a sequential loop here.

57:01

57 minutes, 1 second

we're just going to run one coding agent at a time. This is a good way to just sort of um get your feet wet essentially.

57:08

57 minutes, 8 seconds

So, it's prioritizing critical bug fixes, development infrastructure, then traceable bullets, then polishing quick wins and refactors. And then we just

57:17

57 minutes, 17 seconds

have a very simple kind of instruction on how to complete the task. So, we explore the repo, use TDD to complete the task. I'll get to that later.

57:27

57 minutes, 27 seconds

And we then run some feedback loops. So let's let's just try this and let's just see what happens. So good. It's created the issue files. We should be good to

57:35

57 minutes, 35 seconds

go. I'm going to cancel out of this. I clear and I'm going to run uh where is it? Ralph once.sh. And you

57:44

57 minutes, 44 seconds

can feel free if you're following along to do the same thing.

57:48

57 minutes, 48 seconds

So we can see it's just running Claude inside here with the prompt and with all of the issues that have been passed in.

57:56

57 minutes, 56 seconds

And while it's doing its thing,

57:59

57 minutes, 59 seconds

you probably have some questions about this setup and about the decisions that I've made to essentially delegate all of

58:06

58 minutes, 6 seconds

my coding to AI, right? So, let's let's do a quick Q&A while it's uh getting its feet under.

58:14

58 minutes, 14 seconds

Uh, okay.

58:17

58 minutes, 17 seconds

I'm going to just remove those. How do you retain negative decisions?

58:25

58 minutes, 25 seconds

things that you decided against and ration when persisting the results from the Grommy session. A great question.

58:31

58 minutes, 31 seconds

That's a very simple answer which is the in the PRD uh write a PRD section there is a stuff at the bottom a section of

58:39

58 minutes, 39 seconds

the things that are out of scope. So the things we're not going to tackle in this PRD which is very important for giving a definition of done.

58:47

58 minutes, 47 seconds

Feel free to ping on the slido if you've got any more questions. Uh what's my front end workflow? Okay,

58:53

58 minutes, 53 seconds

that's a great question. I'm gonna I'm gonna answer that in a minute, I think.

58:58

58 minutes, 58 seconds

How to deal with agents producing more code that we can review? How to properly parallelize and use multiple agents in a separate way? Okay, that's um there's

59:06

59 minutes, 6 seconds

two questions there. Um raise your hand if you feel like you're doing more code review now than you used to.

59:16

59 minutes, 16 seconds

Yeah, definitely. Um I don't think there's a way to avoid this.

59:22

59 minutes, 22 seconds

If we delegate all of our coding to agents,

59:27

59 minutes, 27 seconds

you notice that the implementation here is really the only AFK bit. We then also need to QA the work and code review the

59:34

59 minutes, 34 seconds

work, right? And if we are running these loops where it's essentially going to implement four issues in one, it's hard

59:42

59 minutes, 42 seconds

to pair that with the dictim that you should keep pull requests small and self-contained, right? like small

59:50

59 minutes, 50 seconds

self-contained pull requests means you're needing to do fewer loops or shorter loops or something. Or maybe you

59:57

59 minutes, 57 seconds

do like a big stack of PRs, but that seems horrible as well. That's still just more separated code to review. I don't honestly know what the answer to

1:00:05

1 hour, 5 seconds

this yet. I think we just need to be ready to be doing more code review essentially, which is not fun. That's not a fun thing to say. That's not like

1:00:12

1 hour, 12 seconds

I don't know. I don't feel good saying that, but I do think it's probably the the way things are going. It's a great question.

1:00:22

1 hour, 22 seconds

Uh,

1:00:23

1 hour, 23 seconds

can we grab a couple of questions from the room as well? Let's not we won't do the mic, but uh raise your hand if you've got a question for me immediately. Yeah.

1:00:32

1 hour, 32 seconds

So, the approach looks very linear from an idea to QA.

1:00:38

1 hour, 38 seconds

Of course, the real world is a lot more messy. So you have all these ideas that are in parallel and full picture and

1:00:46

1 hour, 46 seconds

while you're working on something else comes in. Yeah.

1:00:50

1 hour, 50 seconds

How do you deal with the messiness? How do you feedback?

1:00:53

1 hour, 53 seconds

Great question. So the question was if this all looks great if you're a solo developer, but actually how do you implement this in a team? How do you

1:01:00

1 hour, 1 minute

gather team feedback on this? And my answer to that is that if you have an idea up there and essentially the sort

1:01:08

1 hour, 1 minute, 8 seconds

of journey from the idea to the destination is something you need to figure out with the team, right? So all of this stuff up here, this is kind of like team stuff, you know what I mean?

1:01:19

1 hour, 1 minute, 19 seconds

So if you have an idea and you do a grilling session on it and you have a question that you don't know how to answer, then you need to loop in your

1:01:26

1 hour, 1 minute, 26 seconds

team as we described before. Then you might need to go, okay, we just need to build a prototype of this. We need to actually hash this out. We need something that the domain experts can

1:01:35

1 hour, 1 minute, 35 seconds

fiddle with. Oh, okay. We might need to integrate a a third party library into this. We might need to do some research.

1:01:41

1 hour, 1 minute, 41 seconds

We might need to actually kind of like um ping this back and forth and find a third party service that we can get the most out of. We might need to go back

1:01:48

1 hour, 1 minute, 48 seconds

with the information that we gathered there to the idea phase. So all the way up to the sort of PRD and the journey,

1:01:55

1 hour, 1 minute, 55 seconds

that's something you need to involve your team with. That's something where these assets are going to be shared and argued over and you're going to have

1:02:02

1 hour, 2 minutes, 2 seconds

requests for comment on them and that that loop is going to just keep grinding and grinding until you figure out where you're going. Once you figure out where

1:02:10

1 hour, 2 minutes, 10 seconds

you're going, then you can start doing the came on board the implementation.

1:02:13

1 hour, 2 minutes, 13 seconds

But this is essentially super arguable and the you'll be bouncing back and forth between the phases. Does that make sense? Yeah.

1:02:20

1 hour, 2 minutes, 20 seconds

Would you not need a PR for your prototype? Say it again. Sorry.

1:02:23

1 hour, 2 minutes, 23 seconds

Would you not want to have a PR for your prototype? The question was, do you want to go through this whole session just to sort of create a prototype? Do you not need a PRD for your prototype as well?

1:02:32

1 hour, 2 minutes, 32 seconds

Let's just quickly talk about prototypes for a second. Um, there was a question about how do you make this work for front end?

1:02:39

1 hour, 2 minutes, 39 seconds

Like how do you because front end is like really sensitive to human eyes. You need human eyes looking at the front end all the time to make sure that it looks good. AI doesn't really have any eyes.

1:02:50

1 hour, 2 minutes, 50 seconds

It can look at code, but it front end is multimodal. And so my experiences with

1:02:57

1 hour, 2 minutes, 57 seconds

trying to plug AI into um let's say agent browser or playright MCP to give it you can give it tools to allow it to

1:03:06

1 hour, 3 minutes, 6 seconds

look through a front end and sort of look at images but in my experience the um it's not very good at that yet and it can't create a nice front end in a

1:03:15

1 hour, 3 minutes, 15 seconds

mature codebase. It can sort of spit one out. But what it can do is you say okay uh I want some ideas on how uh this

1:03:22

1 hour, 3 minutes, 22 seconds

front end might look. give me three prototypes um that I can click between in a throwaway uh throwaway route that I

1:03:30

1 hour, 3 minutes, 30 seconds

can decide which one looks best and you take the asset of that prototype and you then feed it back into the grilling session or you get feedback on it blah

1:03:38

1 hour, 3 minutes, 38 seconds

blah blah blah blah answer your question kind of thing the prototype is just you know it's messy it's supposed to give you feedback early on in the process so

1:03:46

1 hour, 3 minutes, 46 seconds

that's a great way of working with front end code great way of looking at software architecture in general let's go one more question yeah yes in your system How do you integrate

1:03:54

1 hour, 3 minutes, 54 seconds

respecting an architecture a design with API contracts and fitting with a larger system

1:04:02

1 hour, 4 minutes, 2 seconds

security constraints? All kinds of conraints like that. Yeah, there's a lot in that question.

1:04:07

1 hour, 4 minutes, 7 seconds

The question was how do you conform with existing architecture? How do you do um how do you make it conform to the code standards like of your codebase or

1:04:16

1 hour, 4 minutes, 16 seconds

Yeah. architecture design API security rules that constraints your designs. Yeah.

1:04:23

1 hour, 4 minutes, 23 seconds

I'm going to answer that in a bit if that's okay. So hopefully we have started to get some stuff cooking.

1:04:31

1 hour, 4 minutes, 31 seconds

It's just pinging on the explore phase here. Tempted to just start running it AFK.

1:04:40

1 hour, 4 minutes, 40 seconds

Maybe I will, maybe I won't. Um, what it's essentially doing is it's exploring the repo. It's going to then start implementing based on what we wanted.

1:04:49

1 hour, 4 minutes, 49 seconds

Let's actually have one more question just while it's running. Yeah.

1:04:58

1 hour, 4 minutes, 58 seconds

Yeah. So the question was why do you not get AI to QA?

1:05:05

1 hour, 5 minutes, 5 seconds

AI to QA. I just got jargon overload for a second. Um why do you not get AI to uh test its own code? Now of course you

1:05:14

1 hour, 5 minutes, 14 seconds

absolutely can. And I think while it's doing while it's cooking here, okay,

1:05:18

1 hour, 5 minutes, 18 seconds

it's got a clear picture of the codebase. It's assessing the issues. It's doing issue O2 is the next task.

1:05:24

1 hour, 5 minutes, 24 seconds

I'm again going to show you that in a bit. I think the sort of uh because you definitely should do an automated review

1:05:31

1 hour, 5 minutes, 31 seconds

step as part of implementation. So you have your implementation. You should then because tokens are pretty cheap and AI is actually really good at reviewing

1:05:39

1 hour, 5 minutes, 39 seconds

stuff. You should get it to review its own code before you then QA it. I found that that catches a ton of different bugs. And

1:05:48

1 hour, 5 minutes, 48 seconds

the way that works is I will just do a little diagram is if you have let's say an implementation that's sort of like used up a bunch of tokens in the smart

1:05:56

1 hour, 5 minutes, 56 seconds

zone. If you get it to sort of try to do its reviewing, it's going to be doing the reviewing in the dumb zone. And so

1:06:05

1 hour, 6 minutes, 5 seconds

the reviewer will be dumber than the thing that actually implemented it. If we imagine this is the uh let's be consistent, that's the review. That's the implementation.

1:06:15

1 hour, 6 minutes, 15 seconds

Whereas, if you clear the context,

1:06:19

1 hour, 6 minutes, 19 seconds

then you're essentially going to be able to just review in the smart zone, which is where you want to be.

1:06:27

1 hour, 6 minutes, 27 seconds

Let's see how our implementation is doing. Okay, good. It's generating a migration. That looks pretty nice. We're getting some code spitting out.

1:06:37

1 hour, 6 minutes, 37 seconds

And while I'm sort of like, aha, here we go. TDD.

1:06:43

1 hour, 6 minutes, 43 seconds

Let's talk about TDD and then I think we'll have a little another little break. TDD I found is absolutely essential for getting the most out of

1:06:52

1 hour, 6 minutes, 52 seconds

agents. Uh raise your hand if uh you know what TDD is. Cool. Okay. TDD is testdriven development. What it's

1:06:59

1 hour, 6 minutes, 59 seconds

essentially doing is it's doing a something called red green refactor. And if you look in the codebase, you'll be able to find a um a skill which really describes how to do red green refactor.

1:07:11

1 hour, 7 minutes, 11 seconds

and teaches the AI how to do it. So what it's doing is it's writing a failing test first. So it's saying, okay, I've

1:07:19

1 hour, 7 minutes, 19 seconds

broken down the idea of what I'm doing and I'm just going to write a single test that fails and then I need to make

1:07:26

1 hour, 7 minutes, 26 seconds

the implementation pass. I have found that first of all, this adds tests to the codebase and this this tends to add

1:07:33

1 hour, 7 minutes, 33 seconds

good tests to the codebase. And so we've got this kind of gamification service.

1:07:38

1 hour, 7 minutes, 38 seconds

It looks like it's using some existing stuff to create a test database. Test fails because the module doesn't exist yet. Okay, we've confirmed red. And then

1:07:47

1 hour, 7 minutes, 47 seconds

it goes and hopefully runs it and it passes. I found that uh raise your hand if you've ever had AI write bad tests.

1:07:58

1 hour, 7 minutes, 58 seconds

Yeah, it tends to try to cheat at the tests because it's sort of doing it in layers. it will do the entire implementation and then it will do the

1:08:06

1 hour, 8 minutes, 6 seconds

entire test layer just below it. Uh I'm just going to say yes, you're allowed to use npxv text. And using this technique,

1:08:14

1 hour, 8 minutes, 14 seconds

it generally is a lot harder to cheat because it's sort of instrumenting the code before it's then writing the code.

1:08:24

1 hour, 8 minutes, 24 seconds

So I find that TDD is so so good for places where you can pull it off. And in fact, it's so good that I sort of warp

1:08:31

1 hour, 8 minutes, 31 seconds

my whole uh technique around getting TDD to work better. I can see some drooping eyes. It is so hot in here. You can

1:08:39

1 hour, 8 minutes, 39 seconds

imagine how hot it is up here. Let's take another five minute comfort break.

1:08:41

1 hour, 8 minutes, 41 seconds

Let's come back at quarter two. I think have a nice generous one. And we'll be back in about six, seven minutes and

1:08:50

1 hour, 8 minutes, 50 seconds

I'll talk about how uh I think about modules, think about constructing a codebase to make this possible. I've just been sort of fiddling with the AI

1:08:59

1 hour, 8 minutes, 59 seconds

here and we have end up with some with a commit. So we have something to test.

1:09:04

1 hour, 9 minutes, 4 seconds

Issue number two is complete. Here's what was done. This is kind of what it looks like when a Ralph loop completes is you end up with a little summary. Um

1:09:12

1 hour, 9 minutes, 12 seconds

and we have now something we can QA because we did the feedback loops or because we did the tracer bullets because we were uh said okay give us

1:09:21

1 hour, 9 minutes, 21 seconds

something reviewable at the end of this we can immediately go and QA it. Now,

1:09:24

1 hour, 9 minutes, 24 seconds

there's nothing uh less exciting than watching someone else QA something, but hopefully we can have a little play.

1:09:31

1 hour, 9 minutes, 31 seconds

Let's just check that it uh works at all. In fact, before I go there, I just want to sort of work through what just

1:09:38

1 hour, 9 minutes, 38 seconds

happened, which is we see that it's created some stuff on the dashboard and it then ran the feedback loops. So,

1:09:47

1 hour, 9 minutes, 47 seconds

it then ran the tests and the types.

1:09:51

1 hour, 9 minutes, 51 seconds

Now TDD is obviously really important and it's really important because these feedback loops are essential to AI

1:09:59

1 hour, 9 minutes, 59 seconds

essential to get AI to produce anything reasonable because without this AI is totally coding blind right you have to

1:10:07

1 hour, 10 minutes, 7 seconds

have to um if if your codebase doesn't have feedback loops you're never ever ever going to get decent AI decent

1:10:15

1 hour, 10 minutes, 15 seconds

output out of AI and often what you'll find is that the quality of your feedback back loops influences how good

1:10:23

1 hour, 10 minutes, 23 seconds

your AI can code. Essentially, that is the ceiling. So, if you're getting bad outputs from your AI, you often need to increase the quality of your feedback

1:10:31

1 hour, 10 minutes, 31 seconds

loops. We'll talk about how to do that in a minute.

1:10:35

1 hour, 10 minutes, 35 seconds

Now, so it ran uh npm run test, npm ran type check. It got one type error and it needed to fix it with a nice bit of

1:10:43

1 hour, 10 minutes, 43 seconds

TypeScript magic. Very good. Yeah. Typo level thresholds number. Okay.

1:10:49

1 hour, 10 minutes, 49 seconds

You see why I stopped teaching Typescript because just AI knows everything now. Um,

1:10:54

1 hour, 10 minutes, 54 seconds

so and it ran the tests and it passed and it's looking good. So we now end up with 284 tests in this repo. Pretty good.

1:11:03

1 hour, 11 minutes, 3 seconds

I I do find uh front end really hard to test here. We're essentially just testing the service. So we've created a

1:11:10

1 hour, 11 minutes, 10 seconds

gamification service if we look up here and then we have a test for that service. You can see the the service and the test itself. Now, if I was doing

1:11:18

1 hour, 11 minutes, 18 seconds

code review here, I would then go to re I would first go to review the tests,

1:11:22

1 hour, 11 minutes, 22 seconds

make sure the tests were testing reasonable things and then go and kind of review the code itself just to make sure that it's it's not doing anything

1:11:31

1 hour, 11 minutes, 31 seconds

too crazy, right? The essential thing is I need to actually um look at the dashboard. I'm going to log in as a

1:11:39

1 hour, 11 minutes, 39 seconds

student. Oh, if it'll let me. Maybe it won't let me. Come on, son. There we go.

1:11:44

1 hour, 11 minutes, 44 seconds

Let's log in as Emma Wilson. Head into courses.

1:11:49

1 hour, 11 minutes, 49 seconds

Uh, let's say I've got an introduction to TypeScript. Continue learning. Uh, yes, I completed this lesson.

1:11:57

1 hour, 11 minutes, 57 seconds

Something went wrong. I imagine it's because I don't have uh SQLite error. I don't have the right table. So, I need a table point events.

1:12:08

1 hour, 12 minutes, 8 seconds

Point events is a strange table name.

1:12:09

1 hour, 12 minutes, 9 seconds

I'm not sure quite what it was thinking there. Uh, let's suspend. Let's run uh npmdb migrate or push, I think.

1:12:19

1 hour, 12 minutes, 19 seconds

Can't remember which one it was, but you kind of get the idea, right? I I'm not going to subject you to uh watching me do QA because it's so dull. Um but at

1:12:28

1 hour, 12 minutes, 28 seconds

this point, I would essentially go back in. I would um let me open the project back up.

1:12:35

1 hour, 12 minutes, 35 seconds

Uh, and I would this this is a crucial moment. Um, and it's so important to um QA it manually here because QA Oh dear.

1:12:45

1 hour, 12 minutes, 45 seconds

Oh dear. What's going wrong? There we go. QA is how I then um impose my uh opinions back onto the codebase, how

1:12:54

1 hour, 12 minutes, 54 seconds

I impose my taste. What you'll often find is that um there are teams out there who are trying to automate everything like every part of this

1:13:02

1 hour, 13 minutes, 2 seconds

process and they will tend to uh if you try to like automate the sort of creation of the idea, automate uh the

1:13:11

1 hour, 13 minutes, 11 seconds

QA, automate the research, automate the prototype, you end up with uh apps that I feel just lack taste and are bad.

1:13:22

1 hour, 13 minutes, 22 seconds

maybe they just don't work or they they don't even work as intended or there's just no AI. You need a human touch when you're building this stuff because

1:13:29

1 hour, 13 minutes, 29 seconds

without that you just end up with slop and we are not producing slop here.

1:13:33

1 hour, 13 minutes, 33 seconds

We're trying to produce high quality stuff and so that's what the QA is for.

1:13:39

1 hour, 13 minutes, 39 seconds

So I'm going to do two things in this final section which is I'm going to first tell you how to

1:13:46

1 hour, 13 minutes, 46 seconds

there's probably a question in your mind here which is let's say I have a codebase that I'm working on and it's a bad codebase. It's a codebase that's

1:13:55

1 hour, 13 minutes, 55 seconds

like really complicated uh that AI just never does good work in and maybe actually most humans that go into that codebase don't do good work. How what

1:14:04

1 hour, 14 minutes, 4 seconds

how do I improve that codebase? And the second thing is I'll show you my setup for parallelization. So let's go with um bad code first.

1:14:14

1 hour, 14 minutes, 14 seconds

Now where is it? Where's the diagram? Here it is.

1:14:19

1 hour, 14 minutes, 19 seconds

In his book um the philosophy of software design, John Alistster talks about the ideal type of module.

1:14:29

1 hour, 14 minutes, 29 seconds

And let's imagine that you have a codebase that looks like this. Each of these uh blocks here are individual files. And these files export things

1:14:37

1 hour, 14 minutes, 37 seconds

from them. You know, they have um things that you pull from the files that you then use in other things. And so you might have these weird dependencies where this file over here might rely on

1:14:46

1 hour, 14 minutes, 46 seconds

this file or might rely on that file for instance. Now, if these files are small and they don't kind of ex like export

1:14:54

1 hour, 14 minutes, 54 seconds

many things, then John would call these shallow modules essentially where they're not very um they kind of look

1:15:02

1 hour, 15 minutes, 2 seconds

like uh this. If I actually no I can't can't make a good diagram of it. They're essentially lots and lots of small chunks. Now this is hard for the AI to

1:15:12

1 hour, 15 minutes, 12 seconds

navigate because it doesn't really understand the dependencies between everything. It can't work out where everything is. You know it has to sort of manually track through the entire

1:15:20

1 hour, 15 minutes, 20 seconds

graph and go okay this relies on this one relies on this one. This one relies on this one.

1:15:26

1 hour, 15 minutes, 26 seconds

And it's then also hard to test this as well because where do you draw your test boundaries here? Do you test each module individually?

1:15:35

1 hour, 15 minutes, 35 seconds

Like just literally draw a test boundary. No, don't do that. Around this one and then maybe another test boundary around the next one and then the next

1:15:43

1 hour, 15 minutes, 43 seconds

one or should you sort of do big groups of it? Should you say, okay, we're going to test all of these related modules together and just sort of, you know,

1:15:53

1 hour, 15 minutes, 53 seconds

hope and pray that they work.

1:15:57

1 hour, 15 minutes, 57 seconds

Now this means that if I think that bad tests mostly look like that where the AI essentially tries to sort of wrap every

1:16:06

1 hour, 16 minutes, 6 seconds

tiny function in its own test boundary and then just sort of test that those individually work. But what that does is

1:16:13

1 hour, 16 minutes, 13 seconds

it means that when let's say this module over here calls those two. So it depends on both of these. Then this module might

1:16:22

1 hour, 16 minutes, 22 seconds

misorder the functions or there might be sort of stuff inside that poor module that's worth testing on its own. And if you then wrap this in a test boundary,

1:16:31

1 hour, 16 minutes, 31 seconds

what do you do? Do you mock the other two modules? How does that work?

1:16:37

1 hour, 16 minutes, 37 seconds

So actually figuring out how to um build a codebase that is easy to test is

1:16:44

1 hour, 16 minutes, 44 seconds

essential here because if our codebase is easy to test then our code our feedback loops are going to be better and the AI is going to do better work in

1:16:52

1 hour, 16 minutes, 52 seconds

our codebase. Does that make sense? So what does a good codebase looks like?

1:16:56

1 hour, 16 minutes, 56 seconds

Look like well not like that. It looks like this where you have what John Asterhout calls deep modules.

1:17:07

1 hour, 17 minutes, 7 seconds

Modules that have a little interface on there that expose a small simple interface that have a lot of

1:17:13

1 hour, 17 minutes, 13 seconds

functionality inside them. Now what this means is that these are easy to test because you just let's say that

1:17:22

1 hour, 17 minutes, 22 seconds

there's a dependency between this one and this one. My arrow working? Yeah, there we go.

1:17:29

1 hour, 17 minutes, 29 seconds

Then what you do is you just wrap a big test boundary around that one module around this one up here. And you're going to

1:17:36

1 hour, 17 minutes, 36 seconds

catch a lot of good stuff because there's lots of functionality that you're testing and really the

1:17:44

1 hour, 17 minutes, 44 seconds

caller, the person calling the module is going to have a simple interface to work from. So it's not not too tricky. That makes sense. Deep modules versus shallow

1:17:52

1 hour, 17 minutes, 52 seconds

modules. This is good. This shallow version is bad. And what I find is that unaided

1:18:00

1 hour, 18 minutes

um or if you don't uh if you don't watch AI carefully, it's going to produce a codebase that looks

1:18:07

1 hour, 18 minutes, 7 seconds

like this. So you need to be really really careful when you're directing it.

1:18:11

1 hour, 18 minutes, 11 seconds

And that's why too is that if we look inside the PD,

1:18:16

1 hour, 18 minutes, 16 seconds

uh where is the PR gone? It's inside the issues. It's inside the gamification system. Uh not found. Of course, it's not. Here it is.

1:18:25

1 hour, 18 minutes, 25 seconds

Then I have uh inside here data model the modules.

1:18:32

1 hour, 18 minutes, 32 seconds

So it's specifically saying okay this gamification service is a new deep module which we're going to test around.

1:18:38

1 hour, 18 minutes, 38 seconds

It's going to have this particular interface and it's going to have um okay we're modifying the progress service

1:18:46

1 hour, 18 minutes, 46 seconds

too. We're modifying the lesson route modifying the dashboard roots etc. So,

1:18:50

1 hour, 18 minutes, 50 seconds

it's I'm being really specific about the modules that I'm editing and I'm making sure that I keep that module map in my mind at all times throughout the

1:18:58

1 hour, 18 minutes, 58 seconds

planning and then throughout the implementation. That make sense? Very,

1:19:02

1 hour, 19 minutes, 2 seconds

very useful. It's useful for one other reason, too. Not only does it make your app more testable, but you get to do a little mental trick.

1:19:11

1 hour, 19 minutes, 11 seconds

And I'm going to refill my water while you wait for what that is.

1:19:17

1 hour, 19 minutes, 17 seconds

Uh, let me Let me get a question from you guys. So, raise your hands if you feel like.

1:19:26

1 hour, 19 minutes, 26 seconds

Uh, if you feel like you're working harder than ever before with AI.

1:19:32

1 hour, 19 minutes, 32 seconds

Yeah. Uh, raise your hands if you feel like you know your codebase less well than you used to.

1:19:40

1 hour, 19 minutes, 40 seconds

Yeah.

1:19:43

1 hour, 19 minutes, 43 seconds

This is a real thing. um because we're moving fast, because we're delegating more things, we end up losing a sense of

1:19:50

1 hour, 19 minutes, 50 seconds

our codebase. And if we lose the sense of our codebase, we're not going to be able to improve it. And we're essentially delegating the shape of it

1:19:57

1 hour, 19 minutes, 57 seconds

to AI. I don't think that's good. But then how do we how do we make it so that we can move

1:20:04

1 hour, 20 minutes, 4 seconds

fast while still keeping enough space in our brains? I think that this is a way to do it because what you're doing here

1:20:12

1 hour, 20 minutes, 12 seconds

is not only are you thinking about creating big shapes in your codebase, big services.

1:20:19

1 hour, 20 minutes, 19 seconds

What I think you should do is design the interface for these modules, but then delegate the implementation.

1:20:27

1 hour, 20 minutes, 27 seconds

In other words, these modules can become like gray boxes where you just need to know the shape of them. You need to know what they do and sort of how they

1:20:34

1 hour, 20 minutes, 34 seconds

behave, but you can delegate the implementation of those modules. I found this is really nice. I don't necessarily need to co-review everything inside that

1:20:42

1 hour, 20 minutes, 42 seconds

module. I don't necessarily need to know everything of what it's doing. I just need to know that it behaves a certain way under certain conditions and that it does its thing. So, it's kind of like,

1:20:52

1 hour, 20 minutes, 52 seconds

okay, I've got a big overview of my codebase and I understand kind of the shapes inside it, understand what the interfaces all do, but I can delegate

1:21:00

1 hour, 21 minutes

what's inside. I found that has been a really nice way to retain my sense of the codebase while preserving my sanity.

1:21:08

1 hour, 21 minutes, 8 seconds

Make sense?

1:21:12

1 hour, 21 minutes, 12 seconds

And so you might ask, how do I take a codebase that looks like this and then turn it into a codebase that looks like this? How do I deepen the modules? Well,

1:21:23

1 hour, 21 minutes, 23 seconds

we have hopefully it's in here. Pretty sure it is. We have a skill and that skill is called improve codebase architecture.

1:21:32

1 hour, 21 minutes, 32 seconds

Nice and direct.

1:21:35

1 hour, 21 minutes, 35 seconds

Uh let's run it. What this skill is going to do is it's essentially just going to do a scan of our codebase and looking for what's available here. And

1:21:43

1 hour, 21 minutes, 43 seconds

feel free to run this yourself if you're um uh running the exercises. And it's exploring the architecture, exploring um

1:21:52

1 hour, 21 minutes, 52 seconds

essentially how to work within this codebase. and it's going to attempt to uh find places to deepen the modules.

1:22:00

1 hour, 22 minutes

Pretty simple. One really cool um thing that it found here is part of my uh part

1:22:07

1 hour, 22 minutes, 7 seconds

of my course video manager app is a video editor. A video editor built in the browser, which is really hardcore.

1:22:13

1 hour, 22 minutes, 13 seconds

Uh it's a decent bit of engineering. And I wanted a way that I could wrap the entire front end all the way to the back

1:22:21

1 hour, 22 minutes, 21 seconds

end in like a single big module so that I could test the fact that I press something on the front end and it goes all the way to the back end. And so I

1:22:28

1 hour, 22 minutes, 28 seconds

found a way essentially by using a kind of discriminated union between the two types here by sort of I was able to use

1:22:35

1 hour, 22 minutes, 35 seconds

this uh skill to essentially have a huge great big module that just tested from the outside or was testable from the

1:22:43

1 hour, 22 minutes, 43 seconds

outside this video editor infrastructure. And it meant that AI could see the entire flow, could act on the entire flow and test on the entire

1:22:51

1 hour, 22 minutes, 51 seconds

flow. And honestly, it was just night and day in terms of the uh ability of AI to actually make changes because AI working on a video editor is pretty brutal if you don't give it good tests.

1:23:01

1 hour, 23 minutes, 1 second

So that is honestly I if you take one thing away from today, just try running this skill on your repo and see what

1:23:08

1 hour, 23 minutes, 8 seconds

happens. Let's go to slider. Let's ask a uh check a couple of questions just while this is running.

1:23:15

1 hour, 23 minutes, 15 seconds

So let's see. Have you tried claude's auto mode with claude enable auto mode?

1:23:19

1 hour, 23 minutes, 19 seconds

Uh that way you can avoid many of the obvious permission checks. We'll talk about permission checks in a second. Do I keep the markdown plans and issues for later reference?

1:23:29

1 hour, 23 minutes, 29 seconds

Okay, this is a great question. So let's say that you uh have a great idea,

1:23:38

1 hour, 23 minutes, 38 seconds

you turn it into a PR raise and you then implement that PRD and the PRD is essentially done. Raise

1:23:45

1 hour, 23 minutes, 45 seconds

your hand if you keep that information in the repo. So you turn it into a markdown file. Raise your hand if you want to keep that around.

1:23:53

1 hour, 23 minutes, 53 seconds

Cool. Okay. And raise your hand if you if you don't want to keep it around. If you want to get rid of it as soon as possible. Yeah. This is I think an

1:24:02

1 hour, 24 minutes, 2 seconds

a question that doesn't have a clear answer. What I'm really scared of with any documentation decision is that

1:24:11

1 hour, 24 minutes, 11 seconds

let's say that we have a PRD for this gamification system. We keep it in the repo. We go on, go on, go on. Let's say a month later, we want some edits to the

1:24:19

1 hour, 24 minutes, 19 seconds

gamification system. And we go in with Claude and it finds this old PR and says, "Yes, I found the original documentation for the PRD system." Well,

1:24:28

1 hour, 24 minutes, 28 seconds

it turns out that the actual code has changed so much from the original PRD that it's almost unrecognizable. The names of things have changed. The um file structure has changed. Even the

1:24:37

1 hour, 24 minutes, 37 seconds

requirements may have changed. We might have actually tested it with users. This is dock rot where the documentation for something is rotting away in your repo

1:24:46

1 hour, 24 minutes, 46 seconds

and influencing claude badly or claude agents badly. So I tend to not keep it

1:24:53

1 hour, 24 minutes, 53 seconds

around. I tend to get rid of it. And for me because my setup uses GitHub issues,

1:24:58

1 hour, 24 minutes, 58 seconds

I just mark it as closed. It can fetch it if it wants to, but it's got a visual indicator that it's done. So I tend to prefer ditching these.

1:25:07

1 hour, 25 minutes, 7 seconds

Thoughts on the beads framework from Steve? Uh I've not tested it, but it seems like sort of um another way to manage Canvan boards and issues. Seems uh very good, but I've not tried it.

1:25:18

1 hour, 25 minutes, 18 seconds

Um uh let me just quickly check the uh setup here. Let's take a couple of

1:25:27

1 hour, 25 minutes, 27 seconds

questions from the room. Anybody got any questions at this point about anything that we've covered so far, especially this last bit? Yes.

1:25:40

1 hour, 25 minutes, 40 seconds

like code. How about migrations? Like with migration files, we can also squash them off like database migrations.

1:25:49

1 hour, 25 minutes, 49 seconds

Yeah, I don't know.

1:25:53

1 hour, 25 minutes, 53 seconds

I hope that answers your question. I'm so sorry. No, no, I think database migrations are a different thing because you have a sort of running record of exactly what changed and it's more

1:26:01

1 hour, 26 minutes, 1 second

deterministic and I think yeah, it's an interesting analogy. I'm not sure. Let's talk about it afterwards.

1:26:08

1 hour, 26 minutes, 8 seconds

That's a good way of saying I have no idea. Yeah. Yeah.

1:26:16

1 hour, 26 minutes, 16 seconds

Sorry guys. Um I'm just trying to listen to this guy's question.

1:26:30

1 hour, 26 minutes, 30 seconds

Yeah. The question the question here is um should I um in the sort of early planning stage be trying to optimize the

1:26:39

1 hour, 26 minutes, 39 seconds

plan? This is something I actually see a lot of people doing and it's a really good um idea. So when you

1:26:49

1 hour, 26 minutes, 49 seconds

let's go back to the phases. So let's say that you have all of these phases here and you uh you get to the point where

1:26:58

1 hour, 26 minutes, 58 seconds

you've sort of figured out everything with the LLM. you understand where you're going. You've created this sort of journey destination document here.

1:27:05

1 hour, 27 minutes, 5 seconds

How do you then uh like should you then try to optimize and optimize and optimize that PRD until it's the perfect

1:27:12

1 hour, 27 minutes, 12 seconds

PR you can possibly imagine? I don't think there's a lot of value in that because I think the journey is really

1:27:20

1 hour, 27 minutes, 20 seconds

just sort of a hint of where you want to go and the place that you need to be putting the work is in QA and you can

1:27:27

1 hour, 27 minutes, 27 seconds

sort of do that AFK I suppose but in my experience you're not going to get a lot of juice out of it like it's the the thing that really matters is getting

1:27:34

1 hour, 27 minutes, 34 seconds

alignment with the AI which is you do in the grilling session initially.

1:27:40

1 hour, 27 minutes, 40 seconds

Let's have one more question. You got any more? Yeah. How do you get in your workflow to get it to code the way you want it to code? So by the time you get to code review, it's at least familiar,

1:27:50

1 hour, 27 minutes, 50 seconds

use the libraries you wanted to use.

1:27:52

1 hour, 27 minutes, 52 seconds

Yeah. Um, we had this question before actually, which was like uh how do you uh enforce your coding standards on the agent? Essentially, how do you get it to code how you want it to code? Now,

1:28:03

1 hour, 28 minutes, 3 seconds

there's essentially two different ways of doing it. Um, you've got Come on. Push and you've got pull.

1:28:14

1 hour, 28 minutes, 14 seconds

What do I mean by push and pull?

1:28:17

1 hour, 28 minutes, 17 seconds

Um, push is where you push instructions to the LLM. So you say, okay, if you put something in claw.md,

1:28:25

1 hour, 28 minutes, 25 seconds

uh, talk like a pirate, that instruction is always going to be sent to the agent,

1:28:30

1 hour, 28 minutes, 30 seconds

right? So that is a push action. You're pushing tokens to it. Pull is where you give the agent an opportunity to pull more information.

1:28:40

1 hour, 28 minutes, 40 seconds

And that's for instance like skills. So a skill is something that can sit in the repo and it has a little description

1:28:47

1 hour, 28 minutes, 47 seconds

header that says okay agent you may pull this when you want to.

1:28:53

1 hour, 28 minutes, 53 seconds

My thinking my current thinking about code review and about coding standards looks like this. when you have an implement.

1:29:03

1 hour, 29 minutes, 3 seconds

What's going on? There we go. Implementer.

1:29:06

1 hour, 29 minutes, 6 seconds

I'm going to make this less red in a second. Um, then you want the coding standards to be available via pull. If

1:29:15

1 hour, 29 minutes, 15 seconds

it has a question, you want it to be able to sort of answer it. But if you then have an automated reviewer afterwards, then you want it to push.

1:29:24

1 hour, 29 minutes, 24 seconds

You want to push that information to the reviewer. You want to say, "These are our coding standards." um make sure that this code um follows them. So if you

1:29:32

1 hour, 29 minutes, 32 seconds

have skills for instance, then you want to push that stuff to the reviewer so the reviewer has both the code that's written and the coding standards to compare to.

1:29:42

1 hour, 29 minutes, 42 seconds

Hopefully that answers your question. I can show you an automated version of this as well. Actually, um yeah, let's do that now just while it's fresh in my

1:29:48

1 hour, 29 minutes, 48 seconds

mind. I recently um spent uh maybe a week or so uh building this

1:29:57

1 hour, 29 minutes, 57 seconds

thing called Sand Castle. And Sand Castle is a I was sort of unhappy with the options out there for

1:30:05

1 hour, 30 minutes, 5 seconds

um running agents AFK. And what this does is it's essentially a TypeScript library for running these loops. So you

1:30:12

1 hour, 30 minutes, 12 seconds

have uh a run function that creates a work tree um sandboxes it in a docker

1:30:19

1 hour, 30 minutes, 19 seconds

container and then allows you to run a prompt inside there. And in that work tree then it's just a git branch and you

1:30:26

1 hour, 30 minutes, 26 seconds

have that code and you can then merge it later. If I open up um there are some really really nice

1:30:35

1 hour, 30 minutes, 35 seconds

ways of viewing this and it essentially allows you to run these kind of automated loops and allows you to parallelize across multiple different

1:30:43

1 hour, 30 minutes, 43 seconds

agents really simply. So I'll go into my sand castle file go into main.ts here and let's just walk through this.

1:30:51

1 hour, 30 minutes, 51 seconds

So this is kind of like I showed you um a sort of version of the Ralph loop earlier. This is where we take it from sequential into parallel.

1:31:01

1 hour, 31 minutes, 1 second

We have here first of all a planner that takes in it's has a plan prompt here that looks at the backlog and chooses a

1:31:10

1 hour, 31 minutes, 10 seconds

certain number of issues to work on in parallel. Remember I showed you that canon board where it had all the blocking relationships. It works out all of the phases. So this one will say okay

1:31:19

1 hour, 31 minutes, 19 seconds

uh let's say we have uh you can ignore all this glue code here. This is essentially just a set of issues, GitHub

1:31:26

1 hour, 31 minutes, 26 seconds

issues with a title and with a a branch for you to work on. And then for each

1:31:34

1 hour, 31 minutes, 34 seconds

issue, we create a sandbox and then we run an implement in that sandbox passing in the issue number,

1:31:42

1 hour, 31 minutes, 42 seconds

issue title and the branch. This is like the loop that we ran just before.

1:31:46

1 hour, 31 minutes, 46 seconds

Then if it created some commits, we then review those commits. This is essentially the loop. What do we do with

1:31:54

1 hour, 31 minutes, 54 seconds

those commits? We pass those into a merger agent which takes in a merge prompt, takes in

1:32:03

1 hour, 32 minutes, 3 seconds

the branches that were created, takes in the issues, and it just merges them in. If there are any issues with the merge,

1:32:08

1 hour, 32 minutes, 8 seconds

you know, with the types and tests and that kind of thing, it solves them. And this has been my uh flow for quite a while now for working on most projects.

1:32:16

1 hour, 32 minutes, 16 seconds

It works super super well. And uh yeah,

1:32:19

1 hour, 32 minutes, 19 seconds

I recommend you check out sand castle if you want to sort of learn more. And to answer your question properly is that in the reviewer

1:32:28

1 hour, 32 minutes, 28 seconds

uh I would push the coding standards in the implement I would allow it to pull.

1:32:33

1 hour, 32 minutes, 33 seconds

And I'm actually using uh sonet for implementation and opus for um reviewing because I consider reviewing sort of I

1:32:40

1 hour, 32 minutes, 40 seconds

need I need the smarts. Then any question? Actually, let let me uh before we do more questions, let's go back here. Okay, where are we at? Okay,

1:32:53

1 hour, 32 minutes, 53 seconds

we're sort of zooming everywhere in this uh talk because I'm kind of having to run things in parallel. So, let's go back to the improved codebase architecture. It has finally finished

1:33:01

1 hour, 33 minutes, 1 second

running and it's found a bunch of architectural improvement candidates. So it's got essentially a cluster of different modules that are all kind of

1:33:10

1 hour, 33 minutes, 10 seconds

related that could probably be tested as a unit. Got number one the quiz scoring service. There's some reordering logic

1:33:17

1 hour, 33 minutes, 17 seconds

extraction as well. It has arguments for why they're coupled and it has a dependency category as well. So local

1:33:23

1 hour, 33 minutes, 23 seconds

substitutable in SQLite within memory test DB quiz scoring service currently has zero test. This is the biggest gap. So this

1:33:32

1 hour, 33 minutes, 32 seconds

is what it looks like when we come back of uh improved codebase architecture. Okay.

1:33:39

1 hour, 33 minutes, 39 seconds

So we have nominally kind of 17 minutes left. I don't know about you, but I'm knackered.

1:33:47

1 hour, 33 minutes, 47 seconds

Um I want to let let me kind of sum up for you because I think we're sort of reaching

1:33:54

1 hour, 33 minutes, 54 seconds

the end of our stamina. I'm going to be available for the full time if you want to um come and ask me questions. Um, I might do one more check of the slider,

1:34:00

1 hour, 34 minutes

but let's kind of sum up where we've got to. So,

1:34:06

1 hour, 34 minutes, 6 seconds

this is essentially the flow where throughout this whole process,

1:34:12

1 hour, 34 minutes, 12 seconds

we're bearing in mind the shape of our codebase. This is not a specttocode compiler. This is not an AI that's sort

1:34:19

1 hour, 34 minutes, 19 seconds

of just like churning out code. We are being very intentional with the kind of modules and the shape of the codebase that we want. We are making sure that we

1:34:26

1 hour, 34 minutes, 26 seconds

are as aligned as possible by using the grilling session by really hammering out our idea. We're not overindexing into the PRD. We're not trying to read every

1:34:35

1 hour, 34 minutes, 35 seconds

part of it. We're not thinking too much about it even. We're then just turning that into a set of parallelizable issues which can be worked on by agents in

1:34:42

1 hour, 34 minutes, 42 seconds

parallel. We implement it and we QA and code review the hell out of it and then keep going back to that implementation.

1:34:50

1 hour, 34 minutes, 50 seconds

One thing I didn't really mention is that in the QA phase, what the QA phase is for is creating more issues for that canon board. So while it's implementing

1:34:59

1 hour, 34 minutes, 59 seconds

even, you can be QAing the stuff and going back adding more issues. And the canon board just allows you to add blocking issues kind of um sort of

1:35:06

1 hour, 35 minutes, 6 seconds

infinitely really. And then once that's all done, once you've got code that you're happy with, once you've got work that you're happy with, then you can share it with your team and you can get

1:35:13

1 hour, 35 minutes, 13 seconds

a full review. So this is kind of like once you get here, this is kind of one developer or maybe a couple of developers sort of managing this and

1:35:21

1 hour, 35 minutes, 21 seconds

then it's kind of up to you to figure out how to merge it back in.

1:35:27

1 hour, 35 minutes, 27 seconds

Of course, all of this can be customized by you. This is just something that I have found works. I'm not trying to like sell you on a kind of approach here.

1:35:37

1 hour, 35 minutes, 37 seconds

What I recommend if you take one thing away from this session is that you should head back you should head to Amazon and just buy a ton of those old

1:35:44

1 hour, 35 minutes, 44 seconds

books because I mean I just found it so enlightening reading them. Uh you know preai writing is always like a really

1:35:53

1 hour, 35 minutes, 53 seconds

fun to read anyway and I just on every single page I found that there was something useful and something

1:36:00

1 hour, 36 minutes

interesting to to read. So thank you so much. Thank you for putting up with the heat. Um hopefully your body temperatures will reset soon. Uh thank you very much.
