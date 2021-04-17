var crypto = require('crypto')
var uuid = require('uuid')
var express = require('express')
var mysql = require('mysql')
var bodyParser = require('body-parser')

//CONNECT TO MYSQL
var con = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database:'absensi'
})

var app=express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

//PASSWORD ULTIL
var genRandomString = function(length) {
    return crypto.randomBytes(Math.ceil(length/2)).toString(
        'hex').slice(0,length)
}

var sha512 = function (password,salt) {
    var hash = crypto.createHmac('sha512',salt)
    hash.update(password)
    var value = hash.digest('hex')
    return{
        salt:salt,
        passwordHash:value
    }
}

function saltHashPassword(userPassword) {
    var salt = genRandomString(16)
    var passwordData = sha512(userPassword,salt)
    return passwordData
}

function checkHashPassword(userPassword,salt) {
    var passwordData = sha512(userPassword,salt)
    return passwordData
}

app.post('/register/',(req,res,next)=>{
    var post_data = req.body
    var uid = uuid.v4()
    var plaint_password = post_data.password
    var hash_data = saltHashPassword(plaint_password)
    var password = hash_data.passwordHash
    var salt = hash_data.salt

    var name = post_data.name
    var email = post_data.email

    con.query('SELECT * FROM user WHERE email=?',[email],function(err,result,fields) {
        con.on('error',function(err) {
            console.log('[MYSQL ERROR]',err);
        })
        if (result && result.length) {
            res.json('User already exist')
        } else {
            con.query('INSERT INTO `user`(`unique_id`, `name`, `email`, `password`, `salt`, `created_at`, `update_at`) VALUES (?,?,?,?,?,NOW(),NOW())',
            [uid,name,email,password,salt],function(err,result,fields) {
                con.on('error',function(err) {
                    console.log('[MYSQL ERROR]',err);
                    res.json('Register error: ',err)
                })
            res.json('Register Successful')
            })
        }
    })
})

app.post('/login/',(req,res,next)=>{
    var post_data = req.body

    //EXTRACT EMAIL AND PASSWORD
    var user_password = post_data.password
    var email = post_data.email

    con.query('SELECT * FROM user WHERE email=?',[email],function(err,result,fields) {
        con.on('error',function(err) {
            console.log('[MYSQL ERROR]',err);
        })
        if (result && result.length) {
            var salt = result[0].salt
            var encrypted_password = result[0].password
            //Hash password from Login request with salt in database
            var hashed_password = checkHashPassword(user_password,salt).passwordHash
            if (encrypted_password == hashed_password) {
                res.end(JSON.stringify(result[0]))
            } else {
                res.end(JSON.stringify('Wrong Password'))
            }
        } else {
            res.json('User not exist')
        }
    })

})

app.post('/clock_in/',(req,res,next)=>{
    var post_data = req.body

    var user_id = post_data.userID
    var date = post_data.date
    var clock_in = post_data.clock_in
    var clock_out = post_data.clock_out
    var noted = post_data.noted

    con.query('SELECT * FROM attendance WHERE userID=? AND date=?',
    [user_id,date],function(err,result,fields) {
        con.on('error',function(err) {
            console.log('[MYSQL ERROR]',err);
            res.json('Attendance error: ',err)
        })
        if (result && result.length) {
            res.end(JSON.stringify("Already Clock In"))
        } else {
            con.query('INSERT INTO `attendance`(`userID`, `date`, `clock_in`, `clock_out`, `noted`) VALUES (?,?,?,?,?)',
            [user_id,date,clock_in,clock_out,noted],function(err,result,fields) {
                con.on('error',function(err) {
                    console.log('[MYSQL ERROR]',err);
                    res.json('Attendance error: ',err)
                })
                res.json('Clock In Successful')
            })
        }
    })

})

app.post('/check_clock_in/',(req,res,next)=>{
    var post_data = req.body

    var user_id = post_data.userID
    var date = post_data.date

    con.query('SELECT * FROM attendance WHERE userID=? AND date=?',
    [user_id,date],function(err,result,fields) {
        con.on('error',function(err) {
            console.log('[MYSQL ERROR]',err);
            res.json('Attendance error: ',err)
        })
        if (result && result.length) {
            res.end(JSON.stringify(result[0]))
        } else {
            res.end(JSON.stringify('Not Clock In Yet'))
        }
    })

})

app.post('/clock_out/',(req,res,next)=>{
    var post_data = req.body

    var user_id = post_data.userID
    var date = post_data.date
    var clock_out = post_data.clock_out

    con.query('UPDATE attendance SET clock_out=? WHERE userID=? AND date=?',
    [clock_out,user_id,date],function(err,result,fields) {
        con.on('error',function(err) {
            console.log('[MYSQL ERROR]',err);
            res.json('Attendance error: ',err)
    })
    res.json('Clock Out Successful')
    })

})

// GET SEMENTARA
app.get("/load_attendance/",(req,res,next)=>{

    con.query('SELECT * FROM attendance',function(err,result,fields) {
        con.on('error',function(err) {
            console.log('[MYSQL ERROR]',err);
            res.json('Attendance error: ',err)
        })
        res.json(result)
    })
})

// SEHARUSNYA GETNYA SEPERTI INI
// app.get("/attendance/:id/:date",(req,res,next)=>{
//     var get_data = req.params

//     var user_id = get_data.id
//     var date = "%"+get_data.date

//     con.query('SELECT * FROM attendance WHERE userID=? AND date LIKE ?',
//     [user_id,date],function(err,result,fields) {
//         con.on('error',function(err) {
//             console.log('[MYSQL ERROR]',err);
//             res.json('Attendance error: ',err)
//         })
//         res.json(result)
//     })
// })

//START SERVER
let port = process.env.PORT || 3000
app.listen(port,()=>{
    console.log(`You're Connected in port : ${port}`);
})