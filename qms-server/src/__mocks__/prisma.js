const prisma = {
  clause: {
    findMany:   jest.fn(),
    findFirst:  jest.fn(),
    findUnique: jest.fn(),
    create:     jest.fn(),
    createMany: jest.fn(),
    update:     jest.fn(),
    updateMany: jest.fn(),
    upsert:     jest.fn(),
    delete:     jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findMany:   jest.fn(),
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
  },
  file: {
    findMany:   jest.fn(),
    findUnique: jest.fn(),
    create:     jest.fn(),
    delete:     jest.fn(),
  },
  fileClause: {
    findMany:   jest.fn(),
    create:     jest.fn(),
    createMany: jest.fn(),
    update:     jest.fn(),
    delete:     jest.fn(),
    deleteMany: jest.fn(),
  },
  changeLog: {
    findMany: jest.fn(),
    create:   jest.fn().mockResolvedValue({}),
  },
};

module.exports = prisma;
