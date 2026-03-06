import { Body, Controller, Post, HttpCode, HttpStatus, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { Public } from 'src/decorator/public.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Public()
    @Post('register')
    signUp(@Body() authDto: SignUpDto) {
        return this.authService.signUp(authDto.username, authDto.email, authDto.password);
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('login')
    signIn(@Body() authDto: LoginDto) {
        return this.authService.signIn(authDto.email, authDto.password);
    }


    @Get('profile')
    getProfile(@Request() req: any) {
        return req.user;
    }

    @Get('users')
    getAllUsers(): any {
        return this.authService.getAllUsers();
    }
}
