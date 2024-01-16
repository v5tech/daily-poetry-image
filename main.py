import requests
import json
import os
import boto3

# 目标文件目录
dir_path = os.path.join(os.getcwd(), 'website/src/content/images')
# 备份记录文件
backup_txt_path = os.path.join(dir_path, 'backup.txt')


# 上传图片到s3
def upload_s3(key, img_content, s3_config):
    s3 = boto3.resource(service_name='s3',
                        endpoint_url=s3_config.get('endpoint_url'),
                        aws_access_key_id=s3_config.get('aws_access_key_id'),
                        aws_secret_access_key=s3_config.get('aws_secret_access_key')
                        )
    obj = s3.Bucket(s3_config.get('bucket_name')) \
        .put_object(Key=key, Body=img_content, ContentType="image/png", ACL="public-read")
    response = {attr: getattr(obj, attr) for attr in ['e_tag', 'version_id']}
    return f'{s3_config.get("img_access_url")}/{key}?versionId={response["version_id"]}'


# 解析备份文件列表
def parse_backup_files():
    with open(backup_txt_path, mode='r', encoding='utf-8') as f:
        return f.read().splitlines()


# 获取未备份文件列表
def find_not_backup_files(backup_files_list):
    return [file for file in sorted(os.listdir(dir_path)) if file.endswith('.json') and file not in backup_files_list]


# 检查s3存储桶环境变量
def s3_env_config():
    env_variables = [
        'ENDPOINT_URL',
        'IMG_ACCESS_URL',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'BUCKET_NAME'
    ]
    env_config = {}
    for variable in env_variables:
        env_value = os.environ.get(variable)
        if not env_value:
            print(f'请设置 {variable} 环境变量')
            return None
        env_config[variable.lower()] = env_value
    return env_config


if __name__ == '__main__':
    s3_config = s3_env_config()
    if not s3_config:
        # 程序异常退出
        exit(1)
    print("==================解析备份文件===============")
    backup_files_list = parse_backup_files()
    print("==================获取未备份的文件===============")
    not_backup_files_list = find_not_backup_files(backup_files_list)
    if len(not_backup_files_list) == 0:
        print("没有需要备份的文件")
        # 程序正常退出
        exit(0)
    print("检测到以下文件没有进行备份:")
    for file in not_backup_files_list:
        print(file)
    for file in not_backup_files_list:
        print("\n开始解析{}".format(file))
        with open(os.path.join(dir_path, file), 'r', encoding='utf-8') as f:
            # 读取json文件
            data = json.loads(f.read())
            target = []
            for image in data['images']:
                # 获取图片名称
                image_name = os.path.basename(image)
                print("开始下载{}".format(image_name))
                resp = requests.get(image)
                if resp.status_code == 200:
                    # 上传图片到s3
                    key = '{}/{}'.format(data['localImagesPath'], image_name)
                    upload_url = upload_s3(key, resp.content, s3_config)
                    print("上传{}完毕".format(image_name))
                    target.append(upload_url)
                    print("{} => {}".format(image, upload_url))

            # 替换data['images']为新的s3地址
            data['images'] = target

            # # 备份原文件
            # os.rename(os.path.join(dir, file), os.path.join(dir, '{}.bak'.format(file)))
            # print('备份{}完毕'.format(file))

            # 保存json文件
            with open(os.path.join(dir_path, file), 'w', encoding='utf-8') as new_f:
                json.dump(data, new_f, ensure_ascii=False)

        print('==================保存{}完毕==============='.format(file))

        # 添加该文件到备份记录列表中
        backup_files_list.append(file)

    with open(backup_txt_path, mode='w', encoding='utf-8') as f:
        f.write('\n'.join(backup_files_list))
    print('==================更新备份记录文件完毕===============')
