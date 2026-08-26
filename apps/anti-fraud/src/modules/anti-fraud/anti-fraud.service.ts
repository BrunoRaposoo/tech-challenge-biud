import { Injectable } from '@nestjs/common';
@Injectable()
export class AntiFraudService {
  evaluate(value: number): 'APPROVED' | 'REJECTED' {
    return value > 1000 ? 'REJECTED' : 'APPROVED';
  }
}
