/**
 * 区块链服务 - 处理与区块链的交互
 */
import { ethers } from 'ethers';
import logger from '../utils/logger.js';

/**
 * 区块链服务配置
 */
interface BlockchainServiceOptions {
  defaultRpcUrl?: string;
}

/**
 * 交易选项
 */
interface TransactionOptions {
  gasLimit?: number;
  gasPrice?: string;
  nonce?: number;
  value?: string;
}

/**
 * 区块链服务
 */
export class BlockchainService {
  private providers: Record<string, ethers.providers.JsonRpcProvider> = {};
  private contracts: Record<string, ethers.Contract> = {};

  /**
   * 构造函数
   */
  constructor(options?: BlockchainServiceOptions) {
    if (options?.defaultRpcUrl) {
      this.getProvider(options.defaultRpcUrl);
    }
  }

  /**
   * 获取区块链提供者
   */
  public getProvider(rpcUrl: string): ethers.providers.JsonRpcProvider {
    if (!this.providers[rpcUrl]) {
      this.providers[rpcUrl] = new ethers.providers.JsonRpcProvider(rpcUrl);
      logger.debug(`创建新的区块链提供者: ${rpcUrl}`);
    }
    return this.providers[rpcUrl];
  }

  /**
   * 创建钱包实例
   */
  public createWallet(privateKey: string, rpcUrl: string): ethers.Wallet {
    const provider = this.getProvider(rpcUrl);
    return new ethers.Wallet(privateKey, provider);
  }

  /**
   * 获取私钥对应的地址
   */
  public getAddressFromPrivateKey(privateKey: string): string {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  }

  /**
   * 获取账户余额
   */
  public async getBalance(address: string, rpcUrl: string): Promise<string> {
    const provider = this.getProvider(rpcUrl);
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  }

  /**
   * 获取或创建合约实例
   */
  public getContract(address: string, abi: any, rpcUrl: string): ethers.Contract {
    const key = `${address}-${rpcUrl}`;
    if (!this.contracts[key]) {
      const provider = this.getProvider(rpcUrl);
      this.contracts[key] = new ethers.Contract(address, abi, provider);
      logger.debug(`创建新的合约实例: ${address}`);
    }
    return this.contracts[key];
  }

  /**
   * 连接钱包到合约
   */
  public connectWalletToContract(contract: ethers.Contract, wallet: ethers.Wallet): ethers.Contract {
    return contract.connect(wallet);
  }

  /**
   * 发送交易
   */
  public async sendTransaction(
    wallet: ethers.Wallet,
    to: string,
    data: string,
    options: TransactionOptions = {}
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      const tx = await wallet.sendTransaction({
        to,
        data,
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice ? ethers.utils.parseUnits(options.gasPrice, 'gwei') : undefined,
        nonce: options.nonce,
        value: options.value ? ethers.utils.parseEther(options.value) : undefined
      });

      logger.info(`交易已发送: ${tx.hash}`);
      return tx;
    } catch (error) {
      logger.error('发送交易失败', error);
      throw error;
    }
  }

  /**
   * 调用合约写入方法
   */
  public async callContractWrite(
    contract: ethers.Contract,
    method: string,
    args: any[],
    options: TransactionOptions = {}
  ): Promise<ethers.providers.TransactionResponse> {
    try {
      const tx = await contract[method](...args, {
        gasLimit: options.gasLimit,
        gasPrice: options.gasPrice ? ethers.utils.parseUnits(options.gasPrice, 'gwei') : undefined,
        value: options.value ? ethers.utils.parseEther(options.value) : undefined
      });

      logger.info(`合约交易已发送: ${tx.hash}`);
      return tx;
    } catch (error) {
      logger.error(`调用合约方法失败: ${method}`, error);
      throw error;
    }
  }

  /**
   * 调用合约只读方法
   */
  public async callContractRead(
    contract: ethers.Contract,
    method: string,
    args: any[]
  ): Promise<any> {
    try {
      return await contract[method](...args);
    } catch (error) {
      logger.error(`读取合约方法失败: ${method}`, error);
      throw error;
    }
  }

  /**
   * 等待交易确认
   */
  public async waitForTransaction(tx: ethers.providers.TransactionResponse, confirmations = 1): Promise<ethers.providers.TransactionReceipt> {
    logger.info(`等待交易确认: ${tx.hash}`);
    return await tx.wait(confirmations);
  }

  /**
   * 检查交易状态
   */
  public async checkTransactionStatus(txHash: string, rpcUrl: string): Promise<{ confirmed: boolean; receipt?: ethers.providers.TransactionReceipt }> {
    const provider = this.getProvider(rpcUrl);
    
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        return { confirmed: false };
      }
      
      return {
        confirmed: receipt.confirmations > 0,
        receipt
      };
    } catch (error) {
      logger.error(`检查交易状态失败: ${txHash}`, error);
      return { confirmed: false };
    }
  }
} 