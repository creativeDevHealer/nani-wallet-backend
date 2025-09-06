const express = require('express')
const dotenv = require("dotenv")
const cors = require("cors")

dotenv.config()

const otpRouter = require('./routes/otp')
const app = express()
const port = 5000

app.use(cors())
app.use(express.json({ limit: "50mb" }))

app.use('/api/otp', otpRouter)

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})