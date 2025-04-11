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
 * 批量发送ETH的结果
 */
export interface MulticallSendResult {
  txHash: string;
  sourceAddress: string;
  targets: {
    address: string;
    amount: string;
    success: boolean;
    error?: string;
  }[];
  gasUsed?: string;
  totalAmount: string;
}

/**
 * 区块链服务
 */
export class BlockchainService {
  private providers: Record<string, ethers.providers.JsonRpcProvider> = {};
  private contracts: Record<string, ethers.Contract> = {};
  private defaultRpcUrl?: string;

  /**
   * 构造函数
   */
  constructor(options?: BlockchainServiceOptions) {
    if (options?.defaultRpcUrl) {
      this.defaultRpcUrl = options.defaultRpcUrl;
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

  /**
   * 批量发送ETH给多个地址
   * @param privateKey 私钥（不会保存）
   * @param targets 目标地址数组
   * @param amount 每个地址发送的ETH数量（单位：ETH）
   * @param rpcUrl RPC URL
   * @returns 交易结果
   */
  public async multicallSendEth(
    privateKey: string,
    targets: string[],
    amount: string,
    rpcUrl: string
  ): Promise<MulticallSendResult> {
    try {
      // 验证参数
      if (!privateKey) throw new Error('缺少私钥');
      if (!targets || targets.length === 0) throw new Error('缺少目标地址');
      if (!amount) throw new Error('缺少发送金额');
      if (!rpcUrl) throw new Error('缺少RPC URL');

      // 创建临时钱包（不会保存到存储中）
      const sourceWallet = new ethers.Wallet(privateKey, this.getProvider(rpcUrl));
      const sourceAddress = sourceWallet.address;
      
      // 计算所需总金额（包括gas预估）
      const amountWei = ethers.utils.parseEther(amount);
      const totalAmount = amountWei.mul(targets.length);
      
      // 检查源钱包余额是否足够
      const balance = await sourceWallet.getBalance();
      
      // 预留约0.01 ETH用于gas费用
      const gasReserve = ethers.utils.parseEther('0.01');
      
      if (balance.lt(totalAmount.add(gasReserve))) {
        throw new Error(`余额不足，需要至少 ${ethers.utils.formatEther(totalAmount.add(gasReserve))} ETH`);
      }
      
      // 准备结果对象
      const result: MulticallSendResult = {
        txHash: '',
        sourceAddress,
        targets: [],
        totalAmount: ethers.utils.formatEther(totalAmount)
      };
      
      // 由于以太坊没有原生批量转账功能，我们通过多个单独交易来模拟
      // 未来可以实现通过实际的multicall合约
      logger.info(`开始批量发送ETH到${targets.length}个地址，每个地址${amount} ETH`);
      
      // 创建交易对象数组
      const txPromises = targets.map(async (targetAddress, index) => {
        try {
          // 验证地址格式
          if (!ethers.utils.isAddress(targetAddress)) {
            throw new Error('无效的目标地址');
          }
          
          // 准备交易
          const tx = await sourceWallet.sendTransaction({
            to: targetAddress,
            value: amountWei,
            // 为每个交易设置递增的nonce，确保它们按顺序被矿工打包
            nonce: await sourceWallet.getTransactionCount() + index
          });
          
          // 等待交易被打包
          const receipt = await tx.wait(1);
          
          // 更新结果
          result.targets.push({
            address: targetAddress,
            amount: amount,
            success: true
          });
          
          // 记录第一个交易的哈希（作为整体操作的标识）
          if (index === 0) {
            result.txHash = tx.hash;
          }
          
          logger.info(`成功发送${amount} ETH到地址: ${targetAddress}`);
          return { success: true, address: targetAddress, txHash: tx.hash };
        } catch (error) {
          logger.error(`发送ETH到地址${targetAddress}失败`, error);
          result.targets.push({
            address: targetAddress,
            amount: amount,
            success: false,
            error: (error as Error).message
          });
          return { success: false, address: targetAddress, error };
        }
      });
      
      // 等待所有交易完成
      await Promise.all(txPromises);
      
      // 计算最终余额，间接反映gas使用情况
      const finalBalance = await sourceWallet.getBalance();
      const gasUsed = balance.sub(finalBalance).sub(totalAmount);
      
      result.gasUsed = ethers.utils.formatEther(gasUsed);
      
      logger.info(`批量发送ETH完成，总金额: ${result.totalAmount} ETH，gas消耗: ${result.gasUsed} ETH`);
      return result;
    } catch (error) {
      logger.error('批量发送ETH失败', error);
      throw error;
    }
  }

  /**
   * 获取默认RPC URL
   */
  public getDefaultRpcUrl(): string {
    // 获取默认RPC URL
    return this.defaultRpcUrl || "https://sepolia.base.org";
  }
} 