//bina is function k hum keval errorMiddleware me error ka message bhej skte h lekin is function ki help se hum errorMiddleware me error ka message aur status code dono chej bhej skte h. 

class ErrorHandler extends Error {
    constructor(message,statusCode){
        super(message);
        this.statusCode = statusCode;
    }
}

export  {ErrorHandler};