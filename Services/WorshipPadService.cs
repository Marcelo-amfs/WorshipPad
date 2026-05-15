using System;
using System.IO;
using WorshipPad.Interfaces;

namespace WorshipPad.Services
{
    /// Serviço responsável por gerenciar caminhos e validação de arquivos de áudio
    public class WorshipPadService : IWorshipPadService
    {
        private readonly string basePath;

        public WorshipPadService()
        {
            var appDirectory = AppDomain.CurrentDomain.BaseDirectory;
            basePath = Path.Combine(appDirectory, "Pads", "Shimmer");
        }

        public (bool IsValid, string NormalizedKey) NormalizeAndValidateKey(string key)
        {
            if (string.IsNullOrEmpty(key) || key.Length > 3)
                return (false, string.Empty);

            string normalizedKey = key.ToUpper();

            if (normalizedKey.EndsWith("M") && normalizedKey.Length > 1)
            {
                if (normalizedKey.Length == 2 && normalizedKey[1] == 'M')
                {
                    normalizedKey = normalizedKey[0] + "m";
                }
                else if (normalizedKey.Length == 3 && normalizedKey[1] == '#' && normalizedKey[2] == 'M')
                {
                    normalizedKey = normalizedKey.Substring(0, 2) + "m";
                }
            }

            bool isValid = false;
            if (normalizedKey.Length == 1)
            {
                isValid = true;
            }
            else if (normalizedKey.Length == 2)
            {
                if (normalizedKey[1] == '#' || normalizedKey[1] == 'm')
                    isValid = true;
            }
            else if (normalizedKey.Length == 3)
            {
                if (normalizedKey[1] == '#' && normalizedKey[2] == 'm')
                    isValid = true;
            }

            return (isValid, normalizedKey);
        }

        public string GetAudioFilePath(string key)
        {
            string fileName = key.Replace("#", "s");
            return Path.Combine(basePath, fileName + ".mp3");
        }

        public bool FileExists(string key)
        {
            string path = GetAudioFilePath(key);
            return File.Exists(path);
        }
    }
}