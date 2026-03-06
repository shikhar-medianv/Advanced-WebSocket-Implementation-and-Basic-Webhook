import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Chat {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    sender: string;

    @Column({ nullable: true })
    receiver: string;

    @Column()
    message: string;

    @CreateDateColumn()
    createdAt: Date;
}
