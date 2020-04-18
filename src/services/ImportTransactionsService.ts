import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';

import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import CreateTransactionService from './CreateTransactionService';

interface Request {
  filename: string;
}

interface CSVTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const createTransactionService = new CreateTransactionService();

    const csvFilePath = path.join(uploadConfig.directory, filename);
    const csvFileExists = await fs.promises.stat(csvFilePath);

    if (!csvFileExists) {
      throw new AppError('CSV file not founded.', 404);
    }

    const parsers = csvParse({ from_line: 2, delimiter: ', ' });
    const csvReadStream = fs.createReadStream(csvFilePath);

    const csvTransactions: CSVTransaction[] = [];
    const transactions: Transaction[] = [];
    const parseCSV = csvReadStream.pipe(parsers);

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;

      csvTransactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    // eslint-disable-next-line no-restricted-syntax
    for (const csvTransaction of csvTransactions) {
      const { title, type, category, value } = csvTransaction;

      // eslint-disable-next-line no-await-in-loop
      const transaction = await createTransactionService.execute({
        title,
        type,
        category,
        value,
      });

      transactions.push(transaction);
    }

    return transactions;
  }
}

export default ImportTransactionsService;
