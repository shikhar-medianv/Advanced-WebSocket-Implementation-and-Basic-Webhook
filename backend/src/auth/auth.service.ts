import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  // Register
  async signUp(username: string, email: string, pass: string): Promise<any> {
    const existingUser = await this.usersService.findOne(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(pass, 10);
    const user = await this.usersService.create({
      username,
      email,
      password: hashedPassword,
    });

    const { password, ...result } = user;

    // Create a transporter using environment variables.
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: true,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    // Send an email
    try {
      const info = await transporter.sendMail({
        from: `"${this.configService.get<string>('SMTP_FROM_NAME')}" <${this.configService.get<string>('SMTP_FROM_EMAIL')}>`,
        to: `${result.email}`,
        subject: 'Account Created ✔',
        text: 'Account Created Successfully',
        html: `
  <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
    <div style="max-width:600px; margin:auto; background:white; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.1);">

      <div style="background:#4CAF50; color:white; padding:20px; text-align:center;">
        <h1>🎉 Welcome!</h1>
      </div>

      <div style="padding:30px; text-align:center;">
        <h2 style="color:#333;">Account Created Successfully</h2>
        <p style="color:#555; font-size:16px;">
          Hi <b>${result.username || 'User'}</b>,<br><br>
          Your account has been successfully created.
          You can now log in and start using our platform.
        </p>

        <a href="#" 
        style="display:inline-block; margin-top:20px; padding:12px 25px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px; font-size:16px;">
          Login to Your Account
        </a>
      </div>

      <div style="background:#f1f1f1; padding:15px; text-align:center; font-size:12px; color:#777;">
        © 2026 Shikhar Negi. All rights reserved.
      </div>

    </div>
  </div>
  `,
      });

      console.log('Message sent:', info.messageId);
    } catch (error) {
      console.error('Error sending email:', error);
    }

    return result;
  }

  // Login
  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(email);
    if (!user || !(await bcrypt.compare(pass, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async getAllUsers() {
    return this.usersService.findAll();
  }
}
